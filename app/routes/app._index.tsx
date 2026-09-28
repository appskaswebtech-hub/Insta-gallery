import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
// INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
// import {
//   getInstagramAccount,
//   getInstagramPosts,
//   syncInstagramPosts,
// } from "../instagram.server";
import { getFeed, saveFeed, type FeedInput } from "../feed.server";
import PageFooter from "../components/PageFooter";

const DEFAULT_FEED: FeedInput = {
  postsToShow: "own_posts",
  layout: "grid",
  title: "",
  onPostClick: "popup",
  postSpacing: "small",
  aspectRatio: "3:4",
  postFit: "cover",
  postShape: "rectangle",
  cornerRadius: 0,
  postSize: "medium",
  rowsDesktop: 2,
  colsDesktop: 4,
  rowsMobile: 2,
  colsMobile: 2,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
  // const instagramAccount = await getInstagramAccount(session.shop);
  // const posts = instagramAccount ? await getInstagramPosts(session.shop) : [];
  const posts: never[] = [];
  const feed = await getFeed(session.shop);

  return {
    shop: session.shop,
    instagram: { connected: false as const },
    posts,
    feed: feed ?? DEFAULT_FEED,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
  // if (intent === "sync") {
  //   const syncedCount = await syncInstagramPosts(session.shop);
  //   return { type: "sync" as const, syncedCount };
  // }

  if (intent === "saveFeed") {
    const feed = await saveFeed(session.shop, {
      postsToShow: String(formData.get("postsToShow")),
      layout: String(formData.get("layout")),
      title: String(formData.get("title") ?? ""),
      onPostClick: String(formData.get("onPostClick")),
      postSpacing: String(formData.get("postSpacing")),
      aspectRatio: String(formData.get("aspectRatio")),
      postFit: String(formData.get("postFit")),
      postShape: String(formData.get("postShape")),
      cornerRadius: Number(formData.get("cornerRadius")),
      postSize: String(formData.get("postSize")),
      rowsDesktop: Number(formData.get("rowsDesktop")),
      colsDesktop: Number(formData.get("colsDesktop")),
      rowsMobile: Number(formData.get("rowsMobile")),
      colsMobile: Number(formData.get("colsMobile")),
    });
    return { type: "saveFeed" as const, feed };
  }

  throw new Response("Unknown intent", { status: 400 });
};

export default function Index() {
  const fetcher = useFetcher<typeof action>();
  const { feed } = useLoaderData<typeof loader>();

  const shopify = useAppBridge();
  const isSubmitting = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    // INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
    // if (fetcher.data?.type === "sync") {
    //   shopify.toast.show(`Synced ${fetcher.data.syncedCount} posts`);
    // }
    if (fetcher.data?.type === "saveFeed") {
      shopify.toast.show("Feed saved");
    }
  }, [fetcher.data, shopify]);

  // INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
  // const syncPosts = () =>
  //   fetcher.submit({ intent: "sync" }, { method: "POST" });

  const saveFeedForm = (formData: FormData) => {
    formData.set("intent", "saveFeed");
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page heading="InstaGallery">
      {/* INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
      <s-section heading="Instagram connection">
        {instagram.connected ? (
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-badge tone="success" icon="check-circle">
                Connected
              </s-badge>
              <s-text>@{instagram.username}</s-text>
            </s-stack>
            <s-paragraph>
              Sync pulls in your latest posts and reels so they're ready to
              display on your storefront.
            </s-paragraph>
            <s-button
              onClick={syncPosts}
              icon="refresh"
              accessibilityLabel="Sync posts"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Sync posts
            </s-button>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            <s-badge tone="critical" icon="x-circle">
              Not connected
            </s-badge>
            <s-paragraph>
              Connect your Instagram Business or Creator account to start
              pulling in posts and reels for your shoppable feed.
            </s-paragraph>
            <s-button
              href={`/instagram/connect?shop=${encodeURIComponent(shop)}`}
              target="_top"
              icon="connect"
            >
              Connect Instagram
            </s-button>
          </s-stack>
        )}
      </s-section>
      */}

      {(
        <s-section heading="Feed content">
          <form
            id="feed-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveFeedForm(new FormData(event.currentTarget));
            }}
          >
            <s-stack direction="block" gap="large">
              <s-stack direction="block" gap="base">
                <s-heading>Layout &amp; display</s-heading>
                <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                  {/* INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
                  <s-select
                    label="Posts to show"
                    name="postsToShow"
                    value={feed.postsToShow}
                  >
                    <s-option value="own_posts">Own posts</s-option>
                    <s-option value="reels">Reels</s-option>
                  </s-select>
                  */}
                  <input type="hidden" name="postsToShow" value={feed.postsToShow} />

                  <s-select
                    label="Layout"
                    name="layout"
                    value={feed.layout}
                  >
                    <s-option value="grid">Grid</s-option>
                    <s-option value="slider">Slider</s-option>
                    <s-option value="list">List</s-option>
                    <s-option value="floating">Floating post</s-option>
                  </s-select>

                  <s-grid-item gridColumn="1 / -1">
                    <s-text-field
                      label="Feed title"
                      name="title"
                      defaultValue={feed.title ?? ""}
                      placeholder="Leave empty if you don't want a title"
                    ></s-text-field>
                  </s-grid-item>

                  <s-select
                    label="On post click"
                    name="onPostClick"
                    value={feed.onPostClick}
                  >
                    <s-option value="popup">Open detailed popup</s-option>
                    <s-option value="redirect">Go to Instagram post</s-option>
                  </s-select>

                  <s-select
                    label="Post spacing"
                    name="postSpacing"
                    value={feed.postSpacing}
                  >
                    <s-option value="none">None</s-option>
                    <s-option value="small">Small</s-option>
                    <s-option value="medium">Medium</s-option>
                    <s-option value="large">Large</s-option>
                  </s-select>
                </s-grid>
              </s-stack>

              <s-divider></s-divider>

              <s-stack direction="block" gap="base">
                <s-heading>Appearance</s-heading>
                <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                  <s-select
                    label="Format"
                    name="aspectRatio"
                    value={feed.aspectRatio}
                  >
                    <s-option value="1:1">1:1</s-option>
                    <s-option value="3:4">3:4</s-option>
                    <s-option value="4:5">4:5</s-option>
                    <s-option value="9:16">9:16</s-option>
                    <s-option value="1:2">1:2</s-option>
                    <s-option value="1:3">1:3</s-option>
                    <s-option value="1:4">1:4</s-option>
                  </s-select>

                  <s-select
                    label="Image fit"
                    name="postFit"
                    value={feed.postFit}
                  >
                    <s-option value="cover">Cover (crop to fill)</s-option>
                    <s-option value="contain">Contain (show full image)</s-option>
                  </s-select>

                  <s-select
                    label="Shape"
                    name="postShape"
                    value={feed.postShape}
                  >
                    <s-option value="rectangle">Rectangle</s-option>
                    <s-option value="circle">Circle</s-option>
                  </s-select>

                  <s-number-field
                    label="Corner radius (px)"
                    name="cornerRadius"
                    defaultValue={String(feed.cornerRadius)}
                    min={0}
                    max={50}
                    {...(feed.postShape === "circle" ? { disabled: true } : {})}
                  ></s-number-field>

                  <s-select
                    label="Post size"
                    name="postSize"
                    value={feed.postSize}
                  >
                    <s-option value="small">Small</s-option>
                    <s-option value="medium">Medium</s-option>
                    <s-option value="large">Large</s-option>
                    <s-option value="xlarge">Extra large</s-option>
                  </s-select>
                </s-grid>
              </s-stack>

              <s-divider></s-divider>

              <s-stack direction="block" gap="base">
                <s-heading>Grid dimensions</s-heading>
                <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                  <s-number-field
                    label="Rows - desktop"
                    name="rowsDesktop"
                    defaultValue={String(feed.rowsDesktop)}
                  ></s-number-field>
                  <s-number-field
                    label="Columns - desktop"
                    name="colsDesktop"
                    defaultValue={String(feed.colsDesktop)}
                  ></s-number-field>

                  <s-number-field
                    label="Rows - mobile"
                    name="rowsMobile"
                    defaultValue={String(feed.rowsMobile)}
                  ></s-number-field>
                  <s-number-field
                    label="Columns - mobile"
                    name="colsMobile"
                    defaultValue={String(feed.colsMobile)}
                  ></s-number-field>
                </s-grid>
              </s-stack>

              <s-button
                type="submit"
                variant="primary"
                {...(isSubmitting ? { loading: true } : {})}
              >
                Save feed
              </s-button>
            </s-stack>
          </form>
        </s-section>
      )}

      {/* INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
      {instagram.connected && posts.length === 0 && (
        <s-section>
          <s-banner heading="No posts synced yet" tone="info">
            Click "Sync posts" above to pull in your latest Instagram content.
          </s-banner>
        </s-section>
      )}

      {posts.length > 0 && (
        <s-section heading={`Synced posts (${posts.length})`}>
          <s-grid gridTemplateColumns="repeat(auto-fill, 100px)" gap="base">
            {posts.map((post) => {
              const mediaIcon =
                post.mediaType === "VIDEO"
                  ? "video"
                  : post.mediaType === "CAROUSEL_ALBUM"
                    ? "images"
                    : "image";

              return (
                <div key={post.id} style={{ position: "relative" }}>
                  <img
                    src={post.thumbnailUrl ?? post.mediaUrl}
                    alt={post.caption ?? ""}
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: "cover",
                      borderRadius: 8,
                      display: "block",
                      background: "#f1f2f3",
                    }}
                    onError={(event) => {
                      const img = event.currentTarget;
                      img.onerror = null;
                      img.src =
                        "data:image/svg+xml;utf8," +
                        encodeURIComponent(
                          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
                            '<rect width="100" height="100" fill="#f1f2f3"/>' +
                            '<rect x="22" y="28" width="56" height="44" rx="4" fill="none" stroke="#c4c6c9" stroke-width="3"/>' +
                            '<circle cx="36" cy="42" r="5" fill="#c4c6c9"/>' +
                            '<path d="M22 64 L42 48 L56 60 L68 48 L78 60 L78 68 L22 68 Z" fill="#c4c6c9"/>' +
                            "</svg>",
                        );
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      background: "rgba(255, 255, 255, 0.9)",
                      borderRadius: 6,
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  >
                    <s-icon type={mediaIcon} size="small"></s-icon>
                  </div>
                </div>
              );
            })}
          </s-grid>
        </s-section>
      )}
      */}

      <PageFooter />
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
