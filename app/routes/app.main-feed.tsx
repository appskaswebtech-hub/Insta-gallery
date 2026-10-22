import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { requireActivePlanForLiveStore } from "../billing-access.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  getInstagramAccount,
  getAllInstagramPosts,
  syncInstagramPosts,
  disconnectInstagramAccount,
  setInstagramPostPinned,
  setInstagramPostHidden,
  setInstagramPostsHiddenBulk,
  reorderInstagramPosts,
} from "../instagram.server";
import { getFeed, saveFeed, type FeedInput } from "../feed.server";
import { getCachedPlanHandle } from "../plan-limits.server";
import {
  addProductTag,
  canUseProductTagging,
  getProductTagsForPosts,
  removeProductTag,
  type ProductSearchResult,
} from "../product-tags.server";
import PageFooter from "../components/PageFooter";
import ProductTagger from "../components/ProductTagger";
import styles from "../styles/main-feed.module.css";
import feedStyles from "../styles/main-feed.module.css?inline";

function relativeTime(iso: string) {
  const diffSeconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return rtf.format(0, "minute");
}

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
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);

  const instagramAccount = await getInstagramAccount(session.shop);
  const posts = instagramAccount ? await getAllInstagramPosts(session.shop) : [];
  const feed = await getFeed(session.shop);
  const planHandle = await getCachedPlanHandle(session.shop);
  const canTagProducts = canUseProductTagging(planHandle);

  const tagsByPostKey = await getProductTagsForPosts(
    session.shop,
    posts.map((post) => post.id),
  );

  return {
    shop: session.shop,
    instagram: instagramAccount
      ? {
          connected: true as const,
          username: instagramAccount.username,
          lastSyncedAt: instagramAccount.updatedAt.toISOString(),
          needsReconnect: instagramAccount.tokenExpiresAt < new Date(),
        }
      : { connected: false as const },
    posts: posts.map((post) => ({
      ...post,
      productTags: tagsByPostKey.get(post.id) ?? [],
    })),
    feed: feed ?? DEFAULT_FEED,
    canTagProducts,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync") {
    const syncedCount = await syncInstagramPosts(session.shop);
    return { type: "sync" as const, syncedCount };
  }

  if (intent === "disconnectInstagram") {
    await disconnectInstagramAccount(session.shop);
    return { type: "disconnect" as const };
  }

  if (intent === "pinPost") {
    const id = String(formData.get("id"));
    const pinned = formData.get("pinned") === "true";
    await setInstagramPostPinned(id, pinned);
    return { type: "updated" as const };
  }

  if (intent === "hidePost") {
    const id = String(formData.get("id"));
    const hidden = formData.get("hidden") === "true";
    await setInstagramPostHidden(id, hidden);
    return { type: "updated" as const };
  }

  if (intent === "bulkHidePosts") {
    const ids = String(formData.get("ids") ?? "")
      .split(",")
      .filter(Boolean);
    const hidden = formData.get("hidden") === "true";
    await setInstagramPostsHiddenBulk(session.shop, ids, hidden);
    return { type: "updated" as const };
  }

  if (intent === "reorderPosts") {
    const order = String(formData.get("order") ?? "")
      .split(",")
      .filter(Boolean);
    await reorderInstagramPosts(session.shop, order);
    return { type: "updated" as const };
  }

  if (intent === "tagProduct") {
    const planHandle = await getCachedPlanHandle(session.shop);
    if (!canUseProductTagging(planHandle)) {
      return { type: "error" as const, error: "Product tagging requires the Basic or Pro plan" };
    }

    const postId = String(formData.get("id"));
    await addProductTag(session.shop, postId, {
      id: String(formData.get("productId")),
      handle: String(formData.get("productHandle")),
      title: String(formData.get("productTitle")),
      price: String(formData.get("productPrice")),
      currencyCode: String(formData.get("productCurrencyCode")),
      imageUrl: formData.get("productImageUrl")
        ? String(formData.get("productImageUrl"))
        : null,
      variantId: String(formData.get("productVariantId")),
    });
    return { type: "updated" as const };
  }

  if (intent === "untagProduct") {
    const tagId = String(formData.get("tagId"));
    await removeProductTag(session.shop, tagId);
    return { type: "updated" as const };
  }

  if (intent === "saveFeed") {
    const feed = await saveFeed(session.shop, {
      postsToShow: String(formData.get("postsToShow")),
      layout: String(formData.get("layout")),
      title: String(formData.get("title") ?? ""),
      onPostClick: "popup",
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
  const postFetcher = useFetcher<typeof action>();
  const { shop, instagram, posts, feed, canTagProducts } =
    useLoaderData<typeof loader>();

  const shopify = useAppBridge();
  const isSubmitting = ["loading", "submitting"].includes(fetcher.state);
  const isSyncing = isSubmitting && fetcher.formData?.get("intent") === "sync";
  const isSaving =
    isSubmitting && fetcher.formData?.get("intent") === "saveFeed";
  const isDisconnecting =
    isSubmitting && fetcher.formData?.get("intent") === "disconnectInstagram";
  const [postShape, setPostShape] = useState(feed.postShape);
  const [cornerRadius, setCornerRadius] = useState(String(feed.cornerRadius));
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [postFilter, setPostFilter] = useState<"all" | "shown" | "hidden">(
    "all",
  );
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(
    new Set(),
  );
  const [taggingId, setTaggingId] = useState<string | null>(null);

  const togglePostPin = (id: string, pinned: boolean) =>
    postFetcher.submit(
      { intent: "pinPost", id, pinned: String(!pinned) },
      { method: "POST" },
    );

  const togglePostHide = (id: string, hidden: boolean) =>
    postFetcher.submit(
      { intent: "hidePost", id, hidden: String(!hidden) },
      { method: "POST" },
    );

  const tagProduct = (id: string, product: ProductSearchResult) =>
    postFetcher.submit(
      {
        intent: "tagProduct",
        id,
        productId: product.id,
        productHandle: product.handle,
        productTitle: product.title,
        productPrice: product.price,
        productCurrencyCode: product.currencyCode,
        productImageUrl: product.imageUrl ?? "",
        productVariantId: product.variantId,
      },
      { method: "POST" },
    );

  const untagProduct = (tagId: string) =>
    postFetcher.submit({ intent: "untagProduct", tagId }, { method: "POST" });

  const togglePostSelected = (id: string) =>
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyBulkHide = (hidden: boolean) => {
    postFetcher.submit(
      {
        intent: "bulkHidePosts",
        ids: [...selectedPostIds].join(","),
        hidden: String(hidden),
      },
      { method: "POST" },
    );
    setSelectedPostIds(new Set());
  };

  const [orderedPosts, setOrderedPosts] = useState(() =>
    [...posts].sort((a, b) => a.position - b.position),
  );
  const dragIdRef = useRef<string | null>(null);

  useEffect(() => {
    setOrderedPosts([...posts].sort((a, b) => a.position - b.position));
  }, [posts]);

  const handleDragStart = (id: string) => (event: React.DragEvent) => {
    dragIdRef.current = id;
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (targetId: string) => (event: React.DragEvent) => {
    event.preventDefault();
    const draggedId = dragIdRef.current;
    dragIdRef.current = null;
    if (!draggedId || draggedId === targetId) return;

    const next = [...orderedPosts];
    const fromIndex = next.findIndex((item) => item.id === draggedId);
    const toIndex = next.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedPosts(next);
    postFetcher.submit(
      { intent: "reorderPosts", order: next.map((item) => item.id).join(",") },
      { method: "POST" },
    );
  };

  useEffect(() => {
    if (fetcher.data?.type === "sync") {
      shopify.toast.show(`Synced ${fetcher.data.syncedCount} posts`);
    }
    if (fetcher.data?.type === "saveFeed") {
      shopify.toast.show("Feed saved");
    }
    if (fetcher.data?.type === "disconnect") {
      shopify.toast.show("Instagram account disconnected");
    }
  }, [fetcher.data, shopify]);

  const syncPosts = () =>
    fetcher.submit({ intent: "sync" }, { method: "POST" });

  const disconnectInstagram = () => {
    setConfirmingDisconnect(false);
    fetcher.submit({ intent: "disconnectInstagram" }, { method: "POST" });
  };

  const saveFeedForm = (formData: FormData) => {
    formData.set("intent", "saveFeed");
    fetcher.submit(formData, { method: "POST" });
  };

  const visiblePosts = orderedPosts.filter((post) =>
    postFilter === "shown"
      ? !post.hidden
      : postFilter === "hidden"
        ? post.hidden
        : true,
  );

  return (
    <s-page heading="Main feed" inlineSize="large">
      <style>{feedStyles}</style>
      <div className={styles.workspace}>
        <div className={styles.pageHeader}>
          <div>
            <h1>Your Instagram feed</h1>
            <p>Choose your layout. Style your posts. Make it yours.</p>
          </div>
          <button
            className={styles.saveButton}
            type="submit"
            form="feed-form"
            disabled={isSubmitting}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <s-spinner size="base" />
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="m4 10 4 4 8-8" />
              </svg>
            )}
            {isSaving ? "Saving…" : "Save feed"}
          </button>
        </div>

        <section
          className={styles.connection}
          aria-label="Instagram connection"
        >
          <div className={styles.connectionInfo}>
            <div className={styles.instagramMark} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="25"
                height="25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle
                  cx="17.5"
                  cy="6.5"
                  r="1"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </div>
            <div className={styles.connectionCopy}>
              <div className={styles.connectionTitle}>
                <h2>
                  {instagram.connected
                    ? `@${instagram.username}`
                    : "Connect your Instagram"}
                </h2>
                <span
                  className={
                    instagram.connected ? styles.connected : styles.disconnected
                  }
                >
                  <span aria-hidden="true" />
                  {instagram.connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <p>
                {instagram.connected
                  ? "Sync your latest posts and reels to keep your feed up to date."
                  : "Connect a Business or Creator account to bring in your posts and reels."}
              </p>
              {instagram.connected && (
                <p className={styles.connectionSyncedAt}>
                  Synced {relativeTime(instagram.lastSyncedAt)}
                </p>
              )}
            </div>
          </div>
          <div className={styles.connectionAction}>
            {instagram.connected ? (
              <div className={styles.connectionActions}>
                {instagram.needsReconnect ? (
                  <s-button
                    href={`/instagram/connect?shop=${encodeURIComponent(shop)}`}
                    target="_top"
                    icon="connect"
                  >
                    Reconnect Instagram
                  </s-button>
                ) : (
                  <s-button
                    onClick={syncPosts}
                    icon="refresh"
                    accessibilityLabel="Sync Instagram posts"
                    disabled={isSubmitting}
                    {...(isSyncing ? { loading: true } : {})}
                  >
                    Sync posts
                  </s-button>
                )}
                <button
                  type="button"
                  className={styles.disconnectLink}
                  disabled={isSubmitting}
                  onClick={() => setConfirmingDisconnect(true)}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="nr-instagram-btn">
                <s-button
                  href={`/instagram/connect?shop=${encodeURIComponent(shop)}`}
                  target="_top"
                  variant="primary"
                  icon="connect"
                >
                  Connect Instagram
                </s-button>
              </div>
            )}
          </div>
        </section>

        {instagram.connected && instagram.needsReconnect && (
          <div className={`${styles.inlineBanner} ${styles.warningBanner}`}>
            <strong>Reconnect needed</strong>
            <span>
              Your Instagram access has expired. Reconnect your account to
              keep syncing new posts.
            </span>
          </div>
        )}

        {confirmingDisconnect && (
          <div className={`${styles.inlineBanner} ${styles.criticalBanner}`}>
            <strong>Disconnect this Instagram account?</strong>
            <span>
              Synced posts will be removed, but your custom media stays
              untouched. This can't be undone.
            </span>
            <div className={styles.bannerActions}>
              <button
                type="button"
                className={styles.bannerConfirmButton}
                disabled={isDisconnecting}
                onClick={disconnectInstagram}
              >
                Yes, disconnect
              </button>
              <button
                type="button"
                className={styles.bannerCancelButton}
                onClick={() => setConfirmingDisconnect(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className={styles.editor}>
          <form
            id="feed-form"
            className={styles.settings}
            onSubmit={(event) => {
              event.preventDefault();
              saveFeedForm(new FormData(event.currentTarget));
            }}
          >
            <div className={styles.panelHeader}>
              <div className={styles.headingIcon} aria-hidden="true">
                <s-icon type="settings" size="small" />
              </div>
              <div>
                <h2>Feed settings</h2>
                <p>A few details to make it your own.</p>
              </div>
            </div>

            <section
              className={styles.settingsSection}
              aria-labelledby="layout-heading"
            >
              <h3 id="layout-heading">Layout &amp; display</h3>
              <div className={styles.fieldGrid}>
                <s-select
                  label="Posts to show"
                  name="postsToShow"
                  value={feed.postsToShow}
                >
                  <s-option value="own_posts">Own posts</s-option>
                  <s-option value="reels">Reels</s-option>
                </s-select>
                <s-text-field
                  label="Feed title"
                  name="title"
                  defaultValue={feed.title ?? ""}
                  placeholder="e.g. Our Instagram"
                />
                <fieldset
                  className={`${styles.layoutField} ${styles.fullWidth}`}
                >
                  <legend>Layout</legend>
                  <div className={styles.layoutOptions}>
                    {(["grid", "slider", "list"] as const).map((layout) => (
                      <label key={layout} className={styles.layoutOption}>
                        <input
                          type="radio"
                          name="layout"
                          value={layout}
                          defaultChecked={feed.layout === layout}
                        />
                        <span className={styles.layoutTile}>
                          <span className={styles[layout]} aria-hidden="true">
                            {Array.from(
                              { length: layout === "grid" ? 6 : 3 },
                              (_, index) => (
                                <i key={index} />
                              ),
                            )}
                          </span>
                          <span>
                            {layout === "grid"
                              ? "Grid"
                              : layout === "slider"
                                ? "Slider"
                                : "List"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
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
              </div>
            </section>

            <section
              className={styles.settingsSection}
              aria-labelledby="appearance-heading"
            >
              <h3 id="appearance-heading">Appearance</h3>
              <div className={styles.fieldGrid}>
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
                <s-select label="Image fit" name="postFit" value={feed.postFit}>
                  <s-option value="cover">Cover (crop to fill)</s-option>
                  <s-option value="contain">Contain (show full image)</s-option>
                </s-select>
                <s-select
                  label="Shape"
                  name="postShape"
                  value={postShape}
                  onChange={(event) => setPostShape(event.currentTarget.value)}
                >
                  <s-option value="rectangle">Rectangle</s-option>
                  <s-option value="circle">Circle</s-option>
                </s-select>
                <div>
                  {postShape === "circle" && (
                    <input
                      type="hidden"
                      name="cornerRadius"
                      value={cornerRadius}
                    />
                  )}
                  <s-number-field
                    label="Corner radius (px)"
                    name="cornerRadius"
                    value={cornerRadius}
                    onChange={(event) =>
                      setCornerRadius(event.currentTarget.value)
                    }
                    min={0}
                    max={50}
                    disabled={postShape === "circle"}
                  />
                </div>
              </div>
            </section>

            <section
              className={styles.settingsSection}
              aria-labelledby="dimensions-heading"
            >
              <h3 id="dimensions-heading">Grid dimensions</h3>
              <div className={styles.dimensions}>
                <div className={styles.dimensionGroup}>
                  <div className={styles.deviceLabel}>
                    <s-icon type="desktop" size="small" />
                    <span>Desktop</span>
                  </div>
                  <div className={styles.fieldGrid}>
                    <s-number-field
                      label="Rows"
                      name="rowsDesktop"
                      defaultValue={String(feed.rowsDesktop)}
                    />
                    <s-number-field
                      label="Columns"
                      name="colsDesktop"
                      defaultValue={String(feed.colsDesktop)}
                    />
                  </div>
                </div>
                <div className={styles.dimensionGroup}>
                  <div className={styles.deviceLabel}>
                    <s-icon type="mobile" size="small" />
                    <span>Mobile</span>
                  </div>
                  <div className={styles.fieldGrid}>
                    <s-number-field
                      label="Rows"
                      name="rowsMobile"
                      defaultValue={String(feed.rowsMobile)}
                    />
                    <s-number-field
                      label="Columns"
                      name="colsMobile"
                      defaultValue={String(feed.colsMobile)}
                    />
                  </div>
                </div>
              </div>
            </section>
          </form>

          <section className={styles.gallery} aria-labelledby="posts-heading">
            <div className={styles.galleryHeader}>
              <div>
                <div className={styles.galleryTitle}>
                  <h2 id="posts-heading">Synced posts</h2>
                  <span className={styles.count}>{posts.length}</span>
                </div>
                <p>Manage the posts in your Instagram feed.</p>
              </div>
              <span className={styles.gallerySource}>
                <s-icon type="image" size="small" />
                Instagram
              </span>
            </div>
            {posts.length > 0 ? (
              <>
                <div className={styles.galleryHint}>
                  <s-icon type="drag-handle" size="small" />
                  <span>
                    Drag to reorder. Pin your favorites or hide a post.
                  </span>
                </div>

                <div className={styles.filterTabs}>
                  {(
                    [
                      ["all", `All (${posts.length})`],
                      ["shown", `Shown (${posts.filter((p) => !p.hidden).length})`],
                      ["hidden", `Hidden (${posts.filter((p) => p.hidden).length})`],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        postFilter === value
                          ? styles.filterTabActive
                          : styles.filterTab
                      }
                      onClick={() => setPostFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {selectedPostIds.size > 0 && (
                  <div className={styles.bulkBar}>
                    <span>{selectedPostIds.size} selected</span>
                    <button
                      type="button"
                      className={styles.bulkButton}
                      onClick={() => applyBulkHide(false)}
                    >
                      Show selected
                    </button>
                    <button
                      type="button"
                      className={styles.bulkButton}
                      onClick={() => applyBulkHide(true)}
                    >
                      Hide selected
                    </button>
                    <button
                      type="button"
                      className={styles.bulkButton}
                      onClick={() => setSelectedPostIds(new Set())}
                    >
                      Clear selection
                    </button>
                  </div>
                )}

                <div className={styles.postGrid}>
                  {visiblePosts.map((post, index) => {
                    const mediaIcon =
                      post.mediaType === "VIDEO"
                        ? "video"
                        : post.mediaType === "CAROUSEL_ALBUM"
                          ? "images"
                          : "image";
                    const mediaLabel =
                      post.mediaType === "VIDEO"
                        ? "Reel"
                        : post.mediaType === "CAROUSEL_ALBUM"
                          ? "Carousel"
                          : "Photo";
                    return (
                      <div
                        key={post.id}
                        className={styles.postCard}
                        draggable={postFetcher.state === "idle"}
                        onDragStart={handleDragStart(post.id)}
                        onDragEnd={() => {
                          dragIdRef.current = null;
                        }}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop(post.id)}
                      >
                        <div className={styles.postImage}>
                          <input
                            type="checkbox"
                            className={styles.postCheckbox}
                            checked={selectedPostIds.has(post.id)}
                            onChange={() => togglePostSelected(post.id)}
                            aria-label="Select post"
                          />
                          <img
                            src={post.thumbnailUrl ?? post.mediaUrl}
                            alt={
                              post.caption ||
                              `Instagram ${mediaLabel.toLowerCase()} ${index + 1}`
                            }
                            className={
                              post.hidden ? styles.hiddenImage : undefined
                            }
                            loading="lazy"
                            draggable={false}
                            onError={(event) => {
                              const img = event.currentTarget;
                              img.onerror = null;
                              const fallback =
                                "data:image/svg+xml;utf8," +
                                encodeURIComponent(
                                  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300"><rect width="240" height="300" fill="#f1f2f3"/><rect x="92" y="128" width="56" height="44" rx="4" fill="none" stroke="#b5b8bd" stroke-width="2"/><circle cx="107" cy="141" r="5" fill="#b5b8bd"/><path d="m93 164 18-15 14 11 12-10 10 12" fill="none" stroke="#b5b8bd" stroke-width="2"/></svg>',
                                );
                              if (img.src !== fallback) img.src = fallback;
                            }}
                          />
                          <span
                            className={styles.mediaBadge}
                            aria-label={mediaLabel}
                          >
                            <s-icon type={mediaIcon} size="small" />
                          </span>
                          <div className={styles.postBadges}>
                            {post.pinned && (
                              <span className={styles.pinnedBadge}>Pinned</span>
                            )}
                            {post.hidden && (
                              <span className={styles.hiddenBadge}>Hidden</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.postToolbar}>
                          <span className={styles.postType}>
                            <s-icon type="drag-handle" size="small" />
                            {mediaLabel}
                          </span>
                          <div className={styles.postActions}>
                            <button
                              type="button"
                              className={
                                post.pinned
                                  ? styles.activeAction
                                  : styles.postAction
                              }
                              aria-label={
                                post.pinned ? "Unpin post" : "Pin post"
                              }
                              aria-pressed={post.pinned}
                              title={post.pinned ? "Unpin post" : "Pin post"}
                              disabled={postFetcher.state !== "idle"}
                              onClick={() =>
                                togglePostPin(post.id, post.pinned)
                              }
                            >
                              <s-icon
                                type={post.pinned ? "star-filled" : "star"}
                                size="small"
                              />
                            </button>
                            <button
                              type="button"
                              className={
                                post.hidden
                                  ? styles.activeAction
                                  : styles.postAction
                              }
                              aria-label={
                                post.hidden ? "Unhide post" : "Hide post"
                              }
                              aria-pressed={post.hidden}
                              title={post.hidden ? "Unhide post" : "Hide post"}
                              disabled={postFetcher.state !== "idle"}
                              onClick={() =>
                                togglePostHide(post.id, post.hidden)
                              }
                            >
                              <s-icon
                                type={
                                  post.hidden ? "eye-check-mark" : "eye-first"
                                }
                                size="small"
                              />
                            </button>
                          </div>
                        </div>

                        <div className={styles.productSection}>
                          <ProductTagger
                            tags={post.productTags}
                            open={taggingId === post.id}
                            onToggleOpen={() =>
                              setTaggingId(
                                taggingId === post.id ? null : post.id,
                              )
                            }
                            onTag={(product) => tagProduct(post.id, product)}
                            onUntag={untagProduct}
                            disabled={!canTagProducts}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIllustration} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <div>
                    <s-icon type="image" />
                  </div>
                </div>
                <h3>
                  {instagram.connected
                    ? "Your feed starts here"
                    : "Connect to start your feed"}
                </h3>
                <p>
                  {instagram.connected
                    ? 'Click "Sync posts" above to bring in your latest Instagram posts and reels.'
                    : "Connect your Instagram account above to start building your storefront feed."}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
      <PageFooter />
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
