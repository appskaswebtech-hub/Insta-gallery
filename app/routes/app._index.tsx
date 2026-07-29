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
import {
  getInstagramAccount,
  getInstagramPosts,
  syncInstagramPosts,
} from "../instagram.server";
import { getFeed, saveFeed, type FeedInput } from "../feed.server";

const DEFAULT_FEED: FeedInput = {
  postsToShow: "own_posts",
  layout: "grid",
  title: "",
  onPostClick: "popup",
  postSpacing: "small",
  aspectRatio: "3:4",
  roundedCorners: false,
  rowsDesktop: 2,
  colsDesktop: 4,
  rowsMobile: 2,
  colsMobile: 2,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const instagramAccount = await getInstagramAccount(session.shop);
  const posts = instagramAccount ? await getInstagramPosts(session.shop) : [];
  const feed = await getFeed(session.shop);

  return {
    shop: session.shop,
    instagram: instagramAccount
      ? { username: instagramAccount.username, connected: true as const }
      : { connected: false as const },
    posts,
    feed: feed ?? DEFAULT_FEED,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync") {
    const syncedCount = await syncInstagramPosts(session.shop);
    return { type: "sync" as const, syncedCount };
  }

  if (intent === "saveFeed") {
    const feed = await saveFeed(session.shop, {
      postsToShow: String(formData.get("postsToShow")),
      layout: String(formData.get("layout")),
      title: String(formData.get("title") ?? ""),
      onPostClick: String(formData.get("onPostClick")),
      postSpacing: String(formData.get("postSpacing")),
      aspectRatio: String(formData.get("aspectRatio")),
      roundedCorners: formData.get("roundedCorners") === "true",
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
  const { shop, instagram, posts, feed } = useLoaderData<typeof loader>();

  const shopify = useAppBridge();
  const isSubmitting = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data?.type === "sync") {
      shopify.toast.show(`Synced ${fetcher.data.syncedCount} posts`);
    }
    if (fetcher.data?.type === "saveFeed") {
      shopify.toast.show("Feed saved");
    }
  }, [fetcher.data, shopify]);

  const syncPosts = () =>
    fetcher.submit({ intent: "sync" }, { method: "POST" });

  const saveFeedForm = (formData: FormData) => {
    formData.set("intent", "saveFeed");
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page heading="InstaGallery">
      <s-section heading="Instagram connection">
        {instagram.connected ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Connected as <s-text type="strong">@{instagram.username}</s-text>
            </s-paragraph>
            <s-button
              onClick={syncPosts}
              {...(isSubmitting ? { loading: true } : {})}
            >
              Sync posts
            </s-button>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Connect your Instagram Business or Creator account to start
              pulling in posts and reels for your shoppable feed.
            </s-paragraph>
            <s-button
              href={`/instagram/connect?shop=${encodeURIComponent(shop)}`}
              target="_top"
            >
              Connect Instagram
            </s-button>
          </s-stack>
        )}
      </s-section>

      {instagram.connected && (
        <s-section heading="Feed content">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveFeedForm(new FormData(event.currentTarget));
            }}
          >
            <s-stack direction="block" gap="base">
              <s-stack direction="inline" gap="base">
                <s-select
                  label="Posts to show"
                  name="postsToShow"
                  value={feed.postsToShow}
                >
                  <s-option value="own_posts">Own posts</s-option>
                  <s-option value="reels">Reels</s-option>
                </s-select>

                <s-select
                  label="Layout"
                  name="layout"
                  value={feed.layout}
                >
                  <s-option value="grid">Grid</s-option>
                  <s-option value="slider">Slider</s-option>
                  <s-option value="floating">Floating post</s-option>
                </s-select>
              </s-stack>

              <s-text-field
                label="Feed title"
                name="title"
                defaultValue={feed.title ?? ""}
                placeholder="Leave empty if you don't want a title"
              ></s-text-field>

              <s-stack direction="inline" gap="base">
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
              </s-stack>

              <s-stack direction="inline" gap="base">
                <s-select
                  label="Format"
                  name="aspectRatio"
                  value={feed.aspectRatio}
                >
                  <s-option value="1:1">1:1</s-option>
                  <s-option value="3:4">3:4</s-option>
                  <s-option value="4:5">4:5</s-option>
                  <s-option value="9:16">9:16</s-option>
                </s-select>

                <s-select
                  label="Rounded corners"
                  name="roundedCorners"
                  value={feed.roundedCorners ? "true" : "false"}
                >
                  <s-option value="false">No</s-option>
                  <s-option value="true">Yes</s-option>
                </s-select>
              </s-stack>

              <s-stack direction="inline" gap="base">
                <s-number-field
                  label="Number of rows - desktop"
                  name="rowsDesktop"
                  defaultValue={String(feed.rowsDesktop)}
                ></s-number-field>
                <s-number-field
                  label="Number of columns - desktop"
                  name="colsDesktop"
                  defaultValue={String(feed.colsDesktop)}
                ></s-number-field>
              </s-stack>

              <s-stack direction="inline" gap="base">
                <s-number-field
                  label="Number of rows - mobile"
                  name="rowsMobile"
                  defaultValue={String(feed.rowsMobile)}
                ></s-number-field>
                <s-number-field
                  label="Number of columns - mobile"
                  name="colsMobile"
                  defaultValue={String(feed.colsMobile)}
                ></s-number-field>
              </s-stack>

              <s-button
                type="submit"
                {...(isSubmitting ? { loading: true } : {})}
              >
                Save feed
              </s-button>
            </s-stack>
          </form>
        </s-section>
      )}

      {posts.length > 0 && (
        <s-section heading={`Posts (${posts.length})`}>
          <s-grid gridTemplateColumns="repeat(auto-fill, 120px)" gap="base">
            {posts.map((post) => (
              <img
                key={post.id}
                src={post.thumbnailUrl ?? post.mediaUrl}
                alt={post.caption ?? ""}
                style={{
                  width: "120px",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            ))}
          </s-grid>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
