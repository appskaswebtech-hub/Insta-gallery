import { useEffect, useRef, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { requireActivePlanForLiveStore } from "../billing-access.server";
import {
  addCustomMedia,
  deleteCustomMedia,
  getCustomMedia,
  reorderCustomMedia,
  setCustomMediaHidden,
  setCustomMediaPinned,
  updateCustomMediaCaption,
} from "../custom-media.server";
import { saveUploadedFile, resolveMediaUrl } from "../uploads.server";
import { getYouTubeThumbnailUrl } from "../youtube";
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
import styles from "../styles/custom-media.module.css";
import mediaStyles from "../styles/custom-media.module.css?inline";

function customMediaPostKey(id: string) {
  return `custom-${id}`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);
  const media = await getCustomMedia(session.shop);
  const planHandle = await getCachedPlanHandle(session.shop);
  const canTagProducts = canUseProductTagging(planHandle);

  const tagsByPostKey = await getProductTagsForPosts(
    session.shop,
    media.map((item) => customMediaPostKey(item.id)),
  );

  return {
    canTagProducts,
    media: media.map((item) => ({
      ...item,
      url: resolveMediaUrl(item.url),
      youtubeThumbnailUrl:
        item.mediaType === "video" ? getYouTubeThumbnailUrl(item.url) : null,
      productTags: tagsByPostKey.get(customMediaPostKey(item.id)) ?? [],
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add") {
    const url = String(formData.get("url") ?? "").trim();
    const mediaType = String(formData.get("mediaType") ?? "image");

    if (!url) {
      return { error: "Please enter a URL" };
    }

    await addCustomMedia(session.shop, { mediaType, url });
    return { added: true };
  }

  if (intent === "upload") {
    const files = formData
      .getAll("file")
      .filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return { error: "Please choose a file" };
    }

    for (const file of files.slice(0, 10)) {
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const { url } = await saveUploadedFile(file);
      await addCustomMedia(session.shop, { mediaType, url });
    }
    return { added: true, count: files.length };
  }

  if (intent === "delete") {
    const id = String(formData.get("id"));
    await deleteCustomMedia(session.shop, id);
    return { deleted: true };
  }

  if (intent === "pin") {
    const id = String(formData.get("id"));
    const pinned = formData.get("pinned") === "true";
    await setCustomMediaPinned(session.shop, id, pinned);
    return { updated: true };
  }

  if (intent === "hide") {
    const id = String(formData.get("id"));
    const hidden = formData.get("hidden") === "true";
    await setCustomMediaHidden(session.shop, id, hidden);
    return { updated: true };
  }

  if (intent === "caption") {
    const id = String(formData.get("id"));
    const caption = String(formData.get("caption") ?? "");
    await updateCustomMediaCaption(session.shop, id, caption);
    return { updated: true };
  }

  if (intent === "reorder") {
    const order = String(formData.get("order") ?? "")
      .split(",")
      .filter(Boolean);
    await reorderCustomMedia(session.shop, order);
    return { updated: true };
  }

  if (intent === "tagProduct") {
    const planHandle = await getCachedPlanHandle(session.shop);
    if (!canUseProductTagging(planHandle)) {
      return { error: "Product tagging requires the Basic or Pro plan" };
    }

    const id = String(formData.get("id"));
    await addProductTag(session.shop, customMediaPostKey(id), {
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
    return { tagged: true };
  }

  if (intent === "untagProduct") {
    const tagId = String(formData.get("tagId"));
    await removeProductTag(session.shop, tagId);
    return { tagged: true };
  }

  throw new Response("Unknown intent", { status: 400 });
};

type MediaGlyphName =
  | "upload"
  | "link"
  | "image"
  | "video"
  | "youtube"
  | "star"
  | "eye"
  | "hide"
  | "trash"
  | "grip"
  | "plus"
  | "edit";

function MediaGlyph({
  name,
  size = 20,
  filled = false,
}: {
  name: MediaGlyphName;
  size?: number;
  filled?: boolean;
}) {
  const paths: Record<MediaGlyphName, string> = {
    upload: "M12 16V3m-4 4 4-4 4 4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
    link: "m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
    image:
      "M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm-3 13 5-5 5 5 3-3 5 5M9 8h.01",
    video:
      "M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm5 4 6 4-6 4V8Z",
    youtube:
      "M6 5h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Zm4 4 5 3-5 3V9Z",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
    eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    hide: "m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a20 20 0 0 1-3 3.8M6.2 6.2A20 20 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.8-1.8M9.9 9.9a3 3 0 0 0 4.2 4.2",
    trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
    grip: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
    plus: "M12 5v14M5 12h14",
    edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={name === "grip" ? 3 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function CustomMedia() {
  const { media, canTagProducts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const uploadFetcher = useFetcher<typeof action>();
  const itemFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const formRef = useRef<HTMLFormElement>(null);
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    null,
  );
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);
  const [orderedMedia, setOrderedMedia] = useState(media);
  const dragIdRef = useRef<string | null>(null);
  const [editingCaption, setEditingCaption] = useState<{
    id: string;
    caption: string;
  } | null>(null);
  const [taggingId, setTaggingId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedMedia(media);
  }, [media]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (fetcher.data?.added) {
      shopify.toast.show("Media added");
      formRef.current?.reset();
    }
    if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  useEffect(() => {
    if (uploadFetcher.data?.added) {
      const count = "count" in uploadFetcher.data ? uploadFetcher.data.count : 1;
      shopify.toast.show(
        count && count > 1 ? `${count} files uploaded` : "Media uploaded",
      );
      uploadFormRef.current?.reset();
      setSelectedFileName(null);
      setSelectedFileCount(0);
      setPreviewUrl(null);
    }
    if (uploadFetcher.data?.error) {
      shopify.toast.show(uploadFetcher.data.error, { isError: true });
    }
  }, [uploadFetcher.data, shopify]);

  useEffect(() => {
    if (itemFetcher.data?.deleted) {
      shopify.toast.show("Media removed");
    }
  }, [itemFetcher.data, shopify]);

  useEffect(() => {
    if (itemFetcher.data?.updated && itemFetcher.state === "idle") {
      setEditingCaption(null);
    }
  }, [itemFetcher.data, itemFetcher.state]);

  const isSubmitting = ["loading", "submitting"].includes(fetcher.state);
  const isUploading = ["loading", "submitting"].includes(uploadFetcher.state);
  const isBusy = itemFetcher.state !== "idle";

  const deleteMedia = (id: string) =>
    itemFetcher.submit({ intent: "delete", id }, { method: "POST" });

  const togglePin = (id: string, pinned: boolean) =>
    itemFetcher.submit(
      { intent: "pin", id, pinned: String(!pinned) },
      { method: "POST" },
    );

  const toggleHide = (id: string, hidden: boolean) =>
    itemFetcher.submit(
      { intent: "hide", id, hidden: String(!hidden) },
      { method: "POST" },
    );

  const saveCaption = (id: string, caption: string) =>
    itemFetcher.submit({ intent: "caption", id, caption }, { method: "POST" });

  const tagProduct = (id: string, product: ProductSearchResult) =>
    itemFetcher.submit(
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
    itemFetcher.submit({ intent: "untagProduct", tagId }, { method: "POST" });

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

    setOrderedMedia((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((item) => item.id === draggedId);
      const toIndex = next.findIndex((item) => item.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      itemFetcher.submit(
        { intent: "reorder", order: next.map((item) => item.id).join(",") },
        { method: "POST" },
      );

      return next;
    });
  };

  return (
    <s-page heading="Custom media" inlineSize="large">
      <style>{mediaStyles}</style>
      <div className={styles.workspace}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Your media, your way</h1>
            <p>Add your own photos and videos to your storefront feed.</p>
          </div>
          <div className={styles.pageMark} aria-hidden="true">
            <MediaGlyph name="image" size={25} />
          </div>
        </header>

        <div className={styles.addMethods}>
          <section
            className={styles.methodCard}
            aria-labelledby="upload-heading"
          >
            <div className={styles.cardHeader}>
              <div className={styles.headingIcon}>
                <MediaGlyph name="upload" />
              </div>
              <div>
                <h2 id="upload-heading">Upload from your computer</h2>
                <p>Photos or videos from your device.</p>
              </div>
            </div>
            <form
              ref={uploadFormRef}
              className={styles.mediaForm}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                formData.set("intent", "upload");
                uploadFetcher.submit(formData, {
                  method: "POST",
                  encType: "multipart/form-data",
                });
              }}
            >
              <label className={styles.dropZone}>
                {previewUrl ? (
                  <>
                    {previewIsVideo ? (
                      <video
                        className={styles.filePreview}
                        src={previewUrl}
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        className={styles.filePreview}
                        src={previewUrl}
                        alt="Selected file preview"
                      />
                    )}
                    <span className={styles.fileName} aria-live="polite">
                      {selectedFileCount > 1
                        ? `${selectedFileName} + ${selectedFileCount - 1} more`
                        : selectedFileName}
                    </span>
                    <span className={styles.dropHint}>
                      Click to choose different files
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.uploadMark}>
                      <MediaGlyph name="upload" size={25} />
                    </span>
                    <strong>Drop your photos or videos here</strong>
                    <span className={styles.dropHint}>
                      or <span className={styles.browseText}>browse files</span>{" "}
                      — you can select{" "}
                      <span className={styles.multiFileHint}>multiple at once</span>
                    </span>
                    <span className={styles.fileTypes}>
                      <span>
                        <MediaGlyph name="image" size={13} />
                        Images
                      </span>
                      <span>
                        <MediaGlyph name="video" size={13} />
                        Videos
                      </span>
                    </span>
                  </>
                )}
                <input
                  className={styles.fileInput}
                  type="file"
                  name="file"
                  accept="image/*,video/*"
                  multiple
                  aria-label="Choose image or video files"
                  disabled={isUploading}
                  onChange={(event) => {
                    const files = Array.from(event.currentTarget.files ?? []);
                    const firstFile = files[0] ?? null;
                    setSelectedFileName(firstFile?.name ?? null);
                    setSelectedFileCount(files.length);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    if (firstFile) {
                      setPreviewUrl(URL.createObjectURL(firstFile));
                      setPreviewIsVideo(firstFile.type.startsWith("video/"));
                    } else {
                      setPreviewUrl(null);
                    }
                  }}
                />
                {isUploading && (
                  <span className={styles.uploadOverlay} role="status">
                    <span className={styles.spinner} />
                    <strong>
                      {selectedFileCount > 1
                        ? `Uploading ${selectedFileCount} files…`
                        : "Uploading your media…"}
                    </strong>
                  </span>
                )}
              </label>
              <div className={styles.formActions}>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={isUploading || !selectedFileName}
                  aria-busy={isUploading}
                >
                  <MediaGlyph name="upload" size={16} />
                  {isUploading ? "Uploading…" : "Upload media"}
                </button>
              </div>
            </form>
          </section>

          <section
            className={`${styles.methodCard} ${styles.linkCard}`}
            aria-labelledby="link-heading"
          >
            <div className={styles.cardHeader}>
              <div className={styles.headingIcon}>
                <MediaGlyph name="link" />
              </div>
              <div>
                <h2 id="link-heading">Add from a link</h2>
                <p>Bring in media that's already online.</p>
              </div>
            </div>
            <form
              ref={formRef}
              className={styles.mediaForm}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                formData.set("intent", "add");
                fetcher.submit(formData, { method: "POST" });
              }}
            >
              <div className={styles.urlFields}>
                <s-select
                  label="Type"
                  name="mediaType"
                  value="image"
                  icon="image"
                >
                  <s-option value="image">Image</s-option>
                  <s-option value="video">Video</s-option>
                </s-select>
                <s-text-field
                  label="Media URL"
                  name="url"
                  icon="link"
                  placeholder="https://example.com/image.jpg"
                  details="For video, use a direct video file link or a YouTube link."
                ></s-text-field>
              </div>
              <div className={styles.linkNote}>
                <MediaGlyph name="link" size={16} />
                <span>Images, videos and YouTube links, all in one feed.</span>
              </div>
              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className={styles.buttonSpinner} aria-hidden="true" />
                  ) : (
                    <MediaGlyph name="plus" size={16} />
                  )}
                  {isSubmitting ? "Adding media…" : "Add media"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className={styles.gallery} aria-labelledby="gallery-heading">
          <div className={styles.galleryHeader}>
            <div>
              <div className={styles.galleryTitle}>
                <h2 id="gallery-heading">Your custom media</h2>
                <span className={styles.count}>{media.length}</span>
              </div>
              <p>Your own content, ready for your gallery.</p>
            </div>
            {media.length > 0 && (
              <span className={styles.reorderHint}>
                <MediaGlyph name="grip" size={15} />
                Drag to reorder
              </span>
            )}
          </div>
          {media.length > 0 ? (
            <div className={styles.mediaGrid}>
              {orderedMedia.map((item) => {
                const mediaLabel = item.youtubeThumbnailUrl
                  ? "YouTube"
                  : item.mediaType === "video"
                    ? "Video"
                    : "Image";
                const mediaIcon = item.youtubeThumbnailUrl
                  ? "youtube"
                  : item.mediaType === "video"
                    ? "video"
                    : "image";
                const isEditingThis = editingCaption?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className={styles.mediaCard}
                    draggable={!isBusy}
                    onDragStart={handleDragStart(item.id)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(item.id)}
                    onDragEnd={() => {
                      dragIdRef.current = null;
                    }}
                  >
                    <div
                      className={`${styles.mediaVisual} ${item.hidden ? styles.hiddenMedia : ""}`}
                    >
                      {item.mediaType === "video" &&
                      !item.youtubeThumbnailUrl ? (
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          draggable={false}
                        />
                      ) : (
                        <img
                          src={item.youtubeThumbnailUrl ?? item.url}
                          alt={
                            item.caption || `Custom ${mediaLabel.toLowerCase()}`
                          }
                          loading="lazy"
                          draggable={false}
                        />
                      )}
                      <span className={styles.typeBadge}>
                        <MediaGlyph name={mediaIcon} size={13} />
                        {mediaLabel}
                      </span>
                      {item.mediaType === "video" && (
                        <span className={styles.videoMark} aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            width="23"
                            height="23"
                            fill="currentColor"
                          >
                            <path d="m9 5 11 7-11 7V5Z" />
                          </svg>
                        </span>
                      )}
                      <div className={styles.mediaBadges}>
                        {item.pinned && (
                          <span className={styles.pinnedBadge}>Pinned</span>
                        )}
                        {item.hidden && (
                          <span className={styles.hiddenBadge}>Hidden</span>
                        )}
                      </div>
                    </div>

                    {isEditingThis ? (
                      <div className={styles.captionEditRow}>
                        <input
                          className={styles.captionInput}
                          value={editingCaption.caption}
                          placeholder="Add a caption"
                          onChange={(event) =>
                            setEditingCaption({
                              id: item.id,
                              caption: event.currentTarget.value,
                            })
                          }
                        />
                        <div className={styles.captionActions}>
                          <button
                            type="button"
                            className={styles.captionSaveButton}
                            onClick={() =>
                              saveCaption(item.id, editingCaption.caption)
                            }
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.captionCancelButton}
                            onClick={() => setEditingCaption(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      item.caption && (
                        <div className={styles.captionRow}>
                          <span className={styles.captionText}>
                            {item.caption}
                          </span>
                          <button
                            type="button"
                            className={styles.captionEditButton}
                            aria-label="Edit caption"
                            title="Edit caption"
                            disabled={isBusy}
                            onClick={() =>
                              setEditingCaption({
                                id: item.id,
                                caption: item.caption ?? "",
                              })
                            }
                          >
                            <MediaGlyph name="edit" size={14} />
                          </button>
                        </div>
                      )
                    )}

                    <div className={styles.mediaToolbar}>
                      <span
                        className={styles.dragHandle}
                        title="Drag to reorder"
                      >
                        <MediaGlyph name="grip" size={17} />
                      </span>
                      <div className={styles.mediaActions}>
                        <button
                          type="button"
                          className={
                            item.pinned
                              ? styles.activeAction
                              : styles.iconButton
                          }
                          aria-label={item.pinned ? "Unpin media" : "Pin media"}
                          title={item.pinned ? "Unpin media" : "Pin media"}
                          aria-pressed={item.pinned}
                          disabled={isBusy}
                          onClick={() => togglePin(item.id, item.pinned)}
                        >
                          <MediaGlyph
                            name="star"
                            size={17}
                            filled={item.pinned}
                          />
                        </button>
                        <button
                          type="button"
                          className={
                            item.hidden
                              ? styles.activeAction
                              : styles.iconButton
                          }
                          aria-label={
                            item.hidden ? "Unhide media" : "Hide media"
                          }
                          title={item.hidden ? "Unhide media" : "Hide media"}
                          aria-pressed={item.hidden}
                          disabled={isBusy}
                          onClick={() => toggleHide(item.id, item.hidden)}
                        >
                          <MediaGlyph
                            name={item.hidden ? "hide" : "eye"}
                            size={17}
                          />
                        </button>
                        {!item.caption && !isEditingThis && (
                          <button
                            type="button"
                            className={styles.iconButton}
                            aria-label="Add caption"
                            title="Add caption"
                            disabled={isBusy}
                            onClick={() =>
                              setEditingCaption({ id: item.id, caption: "" })
                            }
                          >
                            <MediaGlyph name="edit" size={16} />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.removeButton}
                        disabled={isBusy}
                        onClick={() => deleteMedia(item.id)}
                      >
                        <MediaGlyph name="trash" size={14} />
                        Remove
                      </button>
                    </div>

                    <div className={styles.productSection}>
                      <ProductTagger
                        tags={item.productTags}
                        open={taggingId === item.id}
                        onToggleOpen={() =>
                          setTaggingId(taggingId === item.id ? null : item.id)
                        }
                        onTag={(product) => tagProduct(item.id, product)}
                        onUntag={untagProduct}
                        disabled={!canTagProducts}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIllustration} aria-hidden="true">
                <span>
                  <MediaGlyph name="image" size={26} />
                </span>
                <span>
                  <MediaGlyph name="video" size={26} />
                </span>
              </div>
              <h3>Make your gallery your own</h3>
              <p>
                Upload a photo or video, or add a link above to get started.
              </p>
            </div>
          )}
        </section>
      </div>
      <PageFooter />
    </s-page>
  );
}
