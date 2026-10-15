import { useEffect, useRef, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  addCustomMedia,
  deleteCustomMedia,
  getCustomMedia,
  moveCustomMedia,
  setCustomMediaHidden,
  setCustomMediaPinned,
} from "../custom-media.server";
import { saveUploadedFile, resolveMediaUrl } from "../uploads.server";
import { getYouTubeThumbnailUrl } from "../youtube";
import PageFooter from "../components/PageFooter";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
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
  const { session } = await authenticate.admin(request);
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
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { error: "Please choose a file" };
    }

    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const { url } = await saveUploadedFile(file);
    await addCustomMedia(session.shop, { mediaType, url });
    return { added: true };
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

  if (intent === "move") {
    const id = String(formData.get("id"));
    const direction = formData.get("direction") === "up" ? "up" : "down";
    await moveCustomMedia(session.shop, id, direction);
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);

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
      shopify.toast.show("Media uploaded");
      uploadFormRef.current?.reset();
      setSelectedFileName(null);
      setPreviewUrl(null);
    }
    if (uploadFetcher.data?.error) {
      shopify.toast.show(uploadFetcher.data.error, { isError: true });
    }
  }, [uploadFetcher.data, shopify]);

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

  const moveMedia = (id: string, direction: "up" | "down") =>
    itemFetcher.submit({ intent: "move", id, direction }, { method: "POST" });

  return (
    <s-page heading="Custom media">
      <s-section>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6b6f76, #4a4d52 55%, #2e3033)",
              boxShadow: "0 3px 10px rgba(0, 0, 0, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4M12 4l-4 4M12 4l4 4"></path>
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
            </svg>
          </div>
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
                border: "2px dashed #4a4d52",
                borderRadius: 12,
                padding: 4,
                background: "#f6f6f7",
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
                    <s-text type="strong">{selectedFileName}</s-text>
                    <s-text color="subdued">Click to choose a different file</s-text>
                  </>
                ) : (
                  <>
                    <s-text type="strong">Choose an image or video file</s-text>
                    <s-text color="subdued">
                      Click to browse from your computer
                    </s-text>
                  </>
                )}
                <input
                  type="file"
                  name="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    setSelectedFileName(file?.name ?? null);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    if (file) {
                      setPreviewUrl(URL.createObjectURL(file));
                      setPreviewIsVideo(file.type.startsWith("video/"));
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
                      border: "3px solid #d0d2d6",
                      borderTopColor: "#2e3033",
                      animation: "instaMediaSpin 0.8s linear infinite",
                    }}
                  ></div>
                  <s-text type="strong">Uploading...</s-text>
                </div>
              )}

              <style>{`
                @keyframes instaMediaSpin {
                  to { transform: rotate(360deg); }
                }
                @keyframes instaMediaPulse {
                  0%, 100% { border-color: #4a4d52; }
                  50% { border-color: #b0b3b8; }
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
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6b6f76, #4a4d52 55%, #2e3033)",
              boxShadow: "0 3px 10px rgba(0, 0, 0, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="16" rx="2"></rect>
              <circle cx="8.5" cy="9.5" r="1.5"></circle>
              <path d="M21 15l-5-5-9 9"></path>
            </svg>
          </div>
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
          <s-grid gridTemplateColumns="repeat(auto-fill, 150px)" gap="base">
            {media.map((item, index) => (
              <s-stack key={item.id} direction="block" gap="small-100">
                <s-stack direction="block" gap="small-200">
                  <s-stack direction="inline" gap="small-100">
                    <s-badge>
                      {item.youtubeThumbnailUrl ? "youtube" : item.mediaType}
                    </s-badge>
                    {item.pinned && <s-badge tone="success">Pinned</s-badge>}
                    {item.hidden && <s-badge tone="critical">Hidden</s-badge>}
                  </s-stack>
                  <div style={{ opacity: item.hidden ? 0.45 : 1 }}>
                    {item.youtubeThumbnailUrl ? (
                      <img
                        src={item.youtubeThumbnailUrl}
                        alt=""
                        style={{
                          width: "150px",
                          height: "150px",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                      />
                    ) : item.mediaType === "video" ? (
                      <video
                        src={item.url}
                        style={{
                          width: "150px",
                          height: "150px",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                        muted
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        style={{
                          width: "150px",
                          height: "150px",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                      />
                    )}
                  </div>
                </s-stack>

                <s-stack direction="inline" gap="small-100">
                  <s-button
                    variant="tertiary"
                    icon="arrow-up"
                    accessibilityLabel="Move up"
                    disabled={index === 0}
                    onClick={() => moveMedia(item.id, "up")}
                  ></s-button>
                  <s-button
                    variant="tertiary"
                    icon="arrow-down"
                    accessibilityLabel="Move down"
                    disabled={index === media.length - 1}
                    onClick={() => moveMedia(item.id, "down")}
                  ></s-button>
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
                </s-stack>

                <s-button
                  variant="tertiary"
                  tone="critical"
                  icon="delete"
                  onClick={() => deleteMedia(item.id)}
                >
                  Remove
                </s-button>
              </s-stack>
            ))}
          </s-grid>
        </s-section>
      )}

      <PageFooter />
    </s-page>
  );
}
