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

  const response = await fetch(`${INSTAGRAM_GRAPH_BASE}/me?${params.toString()}`);

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
  const longLived = await exchangeForLongLivedToken(shortLived.access_token);
  const profile = await fetchInstagramProfile(longLived.access_token);

  const tokenExpiresAt = new Date(Date.now() + longLived.expires_in * 1000);

  return prisma.instagramAccount.upsert({
    where: { shop },
    create: {
      shop,
      igUserId: profile.user_id,
      username: profile.username,
      accountType: profile.account_type,
      accessToken: longLived.access_token,
      tokenExpiresAt,
    },
    update: {
      igUserId: profile.user_id,
      username: profile.username,
      accountType: profile.account_type,
      accessToken: longLived.access_token,
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

  let url: string | null = `${INSTAGRAM_GRAPH_BASE}/me/media?${params.toString()}`;

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

export async function syncInstagramPosts(shop: string) {
  const account = await getInstagramAccount(shop);
  if (!account) {
    throw new Error(`No Instagram account connected for shop ${shop}`);
  }

  const media = await fetchAllInstagramMedia(account.accessToken);

  await Promise.all(
    media.map((node) =>
      prisma.instagramPost.upsert({
        where: { shop_igMediaId: { shop, igMediaId: node.id } },
        create: {
          shop,
          igMediaId: node.id,
          mediaType: node.media_type,
          mediaUrl: node.media_url,
          thumbnailUrl: node.thumbnail_url,
          permalink: node.permalink,
          caption: node.caption,
          timestamp: new Date(node.timestamp),
        },
        update: {
          mediaType: node.media_type,
          mediaUrl: node.media_url,
          thumbnailUrl: node.thumbnail_url,
          permalink: node.permalink,
          caption: node.caption,
          timestamp: new Date(node.timestamp),
        },
      }),
    ),
  );

  return media.length;
}

export function getInstagramPosts(shop: string) {
  return prisma.instagramPost.findMany({
    where: { shop, hidden: false },
    orderBy: { timestamp: "desc" },
  });
}
