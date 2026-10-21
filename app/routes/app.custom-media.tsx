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
import PageFooter from "../components/PageFooter";
import IconBadge from "../components/IconBadge";
import MediaTile from "../components/MediaTile";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);
  const media = await getCustomMedia(session.shop);
  return {
    media: media.map((item) => ({
      ...item,
      url: resolveMediaUrl(item.url),
      youtubeThumbnailUrl:
        item.mediaType === "video" ? getYouTubeThumbnailUrl(item.url) : null,
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

  throw new Response("Unknown intent", { status: 400 });
};

export default function CustomMedia() {
  const { media } = useLoaderData<typeof loader>();
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

  useEffect(() => {
    setOrderedMedia(media);
  }, [media]);

  useEffect(() => {
    if (fetcher.data?.added) {
      shopify.toast.show("Media added");
      formRef.current?.reset();
    }
    if (fetcher.data?.deleted) {
      shopify.toast.show("Media removed");
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
    if (itemFetcher.data?.updated && itemFetcher.state === "idle") {
      setEditingCaption(null);
    }
  }, [itemFetcher.data, itemFetcher.state]);

  const isSubmitting = ["loading", "submitting"].includes(fetcher.state);
  const isUploading = ["loading", "submitting"].includes(uploadFetcher.state);

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

  const handleDragStart = (id: string) => () => {
    dragIdRef.current = id;
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
    <s-page heading="Custom media">
      <s-section>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <IconBadge
            path={["M12 16V4M12 4l-4 4M12 4l4 4", "M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"]}
            size="small"
          />
          <s-stack direction="block" gap="small-200">
            <s-heading>Upload from your computer</s-heading>
            <s-text color="subdued">
              Drag and drop, or browse for a file from your device.
            </s-text>
          </s-stack>
        </div>

        <form
          ref={uploadFormRef}
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
          <s-stack direction="block" gap="base">
            <s-text color="subdued">
              Click the box below to browse your device, or drag and drop a
              photo or video into it.
            </s-text>
            <div
              style={{
                position: "relative",
                border: "2px dashed #818cf8",
                borderRadius: 12,
                padding: 4,
                background: "#f5f5ff",
                overflow: "hidden",
                animation: isUploading
                  ? "instaMediaPulse 1.2s ease-in-out infinite"
                  : undefined,
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: previewUrl ? "16px" : "32px 16px",
                  cursor: "pointer",
                }}
              >
                {previewUrl ? (
                  <>
                    {previewIsVideo ? (
                      <video
                        src={previewUrl}
                        muted
                        style={{
                          maxWidth: 200,
                          maxHeight: 160,
                          borderRadius: 8,
                        }}
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt=""
                        style={{
                          maxWidth: 200,
                          maxHeight: 160,
                          borderRadius: 8,
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <s-text type="strong">
                      {selectedFileCount > 1
                        ? `${selectedFileName} + ${selectedFileCount - 1} more`
                        : selectedFileName}
                    </s-text>
                    <s-text color="subdued">Click to choose different files</s-text>
                  </>
                ) : (
                  <>
                    <s-text type="strong">Choose image or video files</s-text>
                    <s-text color="subdued">
                      Click to browse from your computer - you can select
                      multiple files at once
                    </s-text>
                  </>
                )}
                <input
                  type="file"
                  name="file"
                  accept="image/*,video/*"
                  multiple
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
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    overflow: "hidden",
                  }}
                />
              </label>

              {isUploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255, 255, 255, 0.85)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "3px solid #e0e7ff",
                      borderTopColor: "#4f46e5",
                      animation: "instaMediaSpin 0.8s linear infinite",
                    }}
                  ></div>
                  <s-text type="strong">
                    {selectedFileCount > 1
                      ? `Uploading ${selectedFileCount} files...`
                      : "Uploading..."}
                  </s-text>
                </div>
              )}

              <style>{`
                @keyframes instaMediaSpin {
                  to { transform: rotate(360deg); }
                }
                @keyframes instaMediaPulse {
                  0%, 100% { border-color: #818cf8; }
                  50% { border-color: #c7d2fe; }
                }
              `}</style>
            </div>
            <div>
              <s-button
                type="submit"
                variant="primary"
                icon="upload"
                {...(isUploading ? { loading: true } : {})}
              >
                Upload
              </s-button>
            </div>
          </s-stack>
        </form>
      </s-section>

      <s-section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <IconBadge size="small">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <circle cx="8.5" cy="9.5" r="1.5"></circle>
            <path d="M21 15l-5-5-9 9"></path>
          </IconBadge>
          <s-stack direction="block" gap="small-200">
            <s-heading>Upload from URL</s-heading>
            <s-text color="subdued">
              Add an image or video by pasting a direct link to it below.
            </s-text>
          </s-stack>
        </div>

        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            formData.set("intent", "add");
            fetcher.submit(formData, { method: "POST" });
          }}
        >
          <s-stack direction="block" gap="base">
            <s-select label="Type" name="mediaType" value="image" icon="image">
              <s-option value="image">Image</s-option>
              <s-option value="video">Video</s-option>
            </s-select>
            <s-text-field
              label="Media URL"
              name="url"
              icon="link"
              placeholder="https://example.com/image.jpg"
              details="For video, you can paste a direct video file link or a YouTube link."
            ></s-text-field>
            <div>
              <s-button
                type="submit"
                variant="primary"
                icon="plus-circle"
                {...(isSubmitting ? { loading: true } : {})}
              >
                Add media
              </s-button>
            </div>
          </s-stack>
        </form>
      </s-section>

      {media.length > 0 && (
        <s-section heading={`Your custom media (${media.length})`}>
          <s-text color="subdued">
            Drag a tile to reorder. Pinned items always show first on your
            storefront; hidden items stay here but won't be shown.
          </s-text>
          <div style={{ height: 16 }}></div>
          <s-grid gridTemplateColumns="repeat(auto-fill, 150px)" gap="base">
            {orderedMedia.map((item) => {
              const thumbnailSrc = item.youtubeThumbnailUrl ?? item.url;
              const isVideoFile = !item.youtubeThumbnailUrl && item.mediaType === "video";

              return (
                <MediaTile
                  key={item.id}
                  draggable
                  onDragStart={handleDragStart(item.id)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(item.id)}
                >
                  <s-stack direction="inline" gap="small-100">
                    <s-icon type="drag-handle" size="small"></s-icon>
                    <s-badge>
                      {item.youtubeThumbnailUrl ? "youtube" : item.mediaType}
                    </s-badge>
                    {item.pinned && <s-badge tone="success">Pinned</s-badge>}
                    {item.hidden && <s-badge tone="critical">Hidden</s-badge>}
                  </s-stack>

                  <div style={{ opacity: item.hidden ? 0.45 : 1 }}>
                    {isVideoFile ? (
                      <video
                        src={thumbnailSrc}
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          objectFit: "cover",
                          borderRadius: 8,
                          display: "block",
                        }}
                        muted
                      />
                    ) : (
                      <img
                        src={thumbnailSrc}
                        alt=""
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          objectFit: "cover",
                          borderRadius: 8,
                          display: "block",
                        }}
                      />
                    )}
                  </div>

                  {editingCaption?.id === item.id ? (
                    <s-stack direction="block" gap="small-100">
                      <s-text-field
                        label="Caption"
                        labelAccessibilityVisibility="exclusive"
                        value={editingCaption.caption}
                        placeholder="Add a caption"
                        onChange={(event) =>
                          setEditingCaption({
                            id: item.id,
                            caption: event.currentTarget.value,
                          })
                        }
                      ></s-text-field>
                      <s-stack direction="inline" gap="small-100">
                        <s-button
                          variant="primary"
                          onClick={() => saveCaption(item.id, editingCaption.caption)}
                        >
                          Save
                        </s-button>
                        <s-button
                          variant="tertiary"
                          onClick={() => setEditingCaption(null)}
                        >
                          Cancel
                        </s-button>
                      </s-stack>
                    </s-stack>
                  ) : (
                    item.caption && (
                      <s-text color="subdued">{item.caption}</s-text>
                    )
                  )}

                  <s-stack direction="inline" gap="small-100">
                    <s-button
                      variant="tertiary"
                      icon={item.pinned ? "star-filled" : "star"}
                      accessibilityLabel={item.pinned ? "Unpin" : "Pin"}
                      onClick={() => togglePin(item.id, item.pinned)}
                    ></s-button>
                    <s-button
                      variant="tertiary"
                      icon={item.hidden ? "eye-check-mark" : "eye-first"}
                      accessibilityLabel={item.hidden ? "Unhide" : "Hide"}
                      onClick={() => toggleHide(item.id, item.hidden)}
                    ></s-button>
                    <s-button
                      variant="tertiary"
                      icon="edit"
                      accessibilityLabel="Edit caption"
                      onClick={() =>
                        setEditingCaption({ id: item.id, caption: item.caption ?? "" })
                      }
                    ></s-button>
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      icon="delete"
                      accessibilityLabel="Remove"
                      onClick={() => deleteMedia(item.id)}
                    ></s-button>
                  </s-stack>
                </MediaTile>
              );
            })}
          </s-grid>
        </s-section>
      )}

      <PageFooter />
    </s-page>
  );
}
