import prisma from "./db.server";

const INSTAGRAM_OAUTH_BASE = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com";

const SCOPES = ["instagram_business_basic"].join(",");

function getAppUrl() {
  return process.env.SHOPIFY_APP_URL || "";
}

export function getInstagramRedirectUri() {
  return `${getAppUrl()}/instagram/callback`;
}

export function buildInstagramAuthUrl(shop: string) {
  const clientId = process.env.INSTAGRAM_APP_ID;
  if (!clientId) {
    throw new Error("INSTAGRAM_APP_ID is not set");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getInstagramRedirectUri(),
    scope: SCOPES,
    response_type: "code",
    state: shop,
  });

  return `${INSTAGRAM_OAUTH_BASE}?${params.toString()}`;
}

async function exchangeCodeForShortLivedToken(code: string) {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: getInstagramRedirectUri(),
    code,
  });

  const response = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Instagram token exchange failed: ${await response.text()}`);
  }

  return (await response.json()) as {
    access_token: string;
    user_id: string;
  };
}

async function exchangeForLongLivedToken(shortLivedToken: string) {
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!clientSecret) {
    throw new Error("INSTAGRAM_APP_SECRET is not set");
  }

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(`${INSTAGRAM_GRAPH_BASE}/access_token?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Instagram long-lived token exchange failed: ${await response.text()}`);
  }

  return (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

async function fetchInstagramProfile(accessToken: string) {
  const params = new URLSearchParams({
    fields: "user_id,username,account_type",
    access_token: accessToken,
  });

  const response = await fetch(`${INSTAGRAM_GRAPH_BASE}/v21.0/me?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch Instagram profile: ${await response.text()}`);
  }

  return (await response.json()) as {
    user_id: string;
    username: string;
    account_type: string;
  };
}

export async function completeInstagramConnection(shop: string, code: string) {
  const shortLived = await exchangeCodeForShortLivedToken(code);

  let accessToken = shortLived.access_token;
  let tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  try {
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    accessToken = longLived.access_token;
    tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000);
  } catch (error) {
    console.error(
      "Instagram long-lived token exchange failed, falling back to short-lived token (valid ~1 hour):",
      error,
    );
  }

  const profile = await fetchInstagramProfile(accessToken);

  return prisma.instagramAccount.upsert({
    where: { shop },
    create: {
      shop,
      igUserId: profile.user_id,
      username: profile.username,
      accountType: profile.account_type,
      accessToken,
      tokenExpiresAt,
    },
    update: {
      igUserId: profile.user_id,
      username: profile.username,
      accountType: profile.account_type,
      accessToken,
      tokenExpiresAt,
    },
  });
}

export function getInstagramAccount(shop: string) {
  return prisma.instagramAccount.findUnique({ where: { shop } });
}

export function disconnectInstagramAccount(shop: string) {
  return prisma.instagramAccount.deleteMany({ where: { shop } });
}

interface InstagramMediaNode {
  id: string;
  caption?: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

async function fetchAllInstagramMedia(accessToken: string) {
  const media: InstagramMediaNode[] = [];

  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    access_token: accessToken,
    limit: "50",
  });

  let url: string | null = `${INSTAGRAM_GRAPH_BASE}/v21.0/me/media?${params.toString()}`;

  while (url) {
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram media: ${await response.text()}`);
    }

    const json: { data: InstagramMediaNode[]; paging?: { next?: string } } =
      await response.json();

    media.push(...json.data);
    url = json.paging?.next ?? null;
  }

  return media;
}

interface CarouselChild {
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
}

async function fetchCarouselChildren(mediaId: string, accessToken: string) {
  const params = new URLSearchParams({
    fields: "media_type,media_url,thumbnail_url",
    access_token: accessToken,
  });

  const response = await fetch(
    `${INSTAGRAM_GRAPH_BASE}/v21.0/${mediaId}/children?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch carousel children: ${await response.text()}`);
  }

  const json: { data: CarouselChild[] } = await response.json();
  return json.data;
}

export async function syncInstagramPosts(shop: string) {
  const account = await getInstagramAccount(shop);
  if (!account) {
    throw new Error(`No Instagram account connected for shop ${shop}`);
  }

  const feed = await prisma.feed.findUnique({ where: { shop } });
  const autoShowNewPosts = feed?.autoShowNewPosts ?? true;

  const media = await fetchAllInstagramMedia(account.accessToken);

  await Promise.all(
    media.map(async (node) => {
      const carouselChildren =
        node.media_type === "CAROUSEL_ALBUM"
          ? await fetchCarouselChildren(node.id, account.accessToken)
          : null;

      const data = {
        mediaType: node.media_type,
        mediaUrl: node.media_url,
        thumbnailUrl: node.thumbnail_url,
        permalink: node.permalink,
        caption: node.caption,
        carouselChildren: carouselChildren
          ? JSON.stringify(carouselChildren)
          : null,
        timestamp: new Date(node.timestamp),
      };

      return prisma.instagramPost.upsert({
        where: { shop_igMediaId: { shop, igMediaId: node.id } },
        create: { shop, igMediaId: node.id, hidden: !autoShowNewPosts, ...data },
        update: data,
      });
    }),
  );

  const currentMediaIds = media.map((node) => node.id);
  await prisma.instagramPost.deleteMany({
    where: { shop, igMediaId: { notIn: currentMediaIds } },
  });

  // Bump updatedAt so the admin can show a "last synced" time, without
  // adding a dedicated column for it.
  await prisma.instagramAccount.update({
    where: { shop },
    data: { accessToken: account.accessToken },
  });

  return media.length;
}

export async function getInstagramPosts(shop: string) {
  const posts = await prisma.instagramPost.findMany({
    where: { shop, hidden: false },
    orderBy: { timestamp: "desc" },
  });
  return [...posts].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position,
  );
}

export function getAllInstagramPosts(shop: string) {
  return prisma.instagramPost.findMany({
    where: { shop },
    orderBy: { timestamp: "desc" },
  });
}

export function setInstagramPostPinned(id: string, pinned: boolean) {
  return prisma.instagramPost.update({ where: { id }, data: { pinned } });
}

export function setInstagramPostHidden(id: string, hidden: boolean) {
  return prisma.instagramPost.update({ where: { id }, data: { hidden } });
}

export function setInstagramPostsHiddenBulk(
  shop: string,
  ids: string[],
  hidden: boolean,
) {
  return prisma.instagramPost.updateMany({
    where: { shop, id: { in: ids } },
    data: { hidden },
  });
}

export async function reorderInstagramPosts(shop: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.instagramPost.updateMany({
        where: { shop, id },
        data: { position: index },
      }),
    ),
  );
}

export async function moveInstagramPost(
  shop: string,
  id: string,
  direction: "up" | "down",
) {
  const items = await prisma.instagramPost.findMany({
    where: { shop },
    orderBy: { timestamp: "desc" },
  });
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swapWith = items[swapIndex];

  await prisma.$transaction([
    prisma.instagramPost.update({
      where: { id: current.id },
      data: { position: swapWith.position },
    }),
    prisma.instagramPost.update({
      where: { id: swapWith.id },
      data: { position: current.position },
    }),
  ]);
}
