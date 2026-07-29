import { useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  addCustomMedia,
  deleteCustomMedia,
  getCustomMedia,
} from "../custom-media.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const media = await getCustomMedia(session.shop);
  return { media };
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

  if (intent === "delete") {
    const id = String(formData.get("id"));
    await deleteCustomMedia(session.shop, id);
    return { deleted: true };
  }

  throw new Response("Unknown intent", { status: 400 });
};

export default function CustomMedia() {
  const { media } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const formRef = useRef<HTMLFormElement>(null);

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

  const isSubmitting = ["loading", "submitting"].includes(fetcher.state);

  const deleteMedia = (id: string) =>
    fetcher.submit({ intent: "delete", id }, { method: "POST" });

  return (
    <s-page heading="Custom media">
      <s-section heading="Upload from URL">
        <s-paragraph>
          Add your own images or videos to show alongside your Instagram
          posts in the feed. Paste a direct image or video URL below.
        </s-paragraph>
        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            formData.set("intent", "add");
            fetcher.submit(formData, { method: "POST" });
          }}
        >
          <s-stack direction="inline" gap="base">
            <s-select label="Type" name="mediaType" value="image">
              <s-option value="image">Image</s-option>
              <s-option value="video">Video</s-option>
            </s-select>
            <s-text-field
              label="Media URL"
              name="url"
              placeholder="https://example.com/image.jpg"
            ></s-text-field>
            <s-button
              type="submit"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Add media
            </s-button>
          </s-stack>
        </form>
      </s-section>

      {media.length > 0 && (
        <s-section heading={`Your custom media (${media.length})`}>
          <s-grid gridTemplateColumns="repeat(auto-fill, 120px)" gap="base">
            {media.map((item) => (
              <s-stack key={item.id} direction="block" gap="small-100">
                {item.mediaType === "video" ? (
                  <video
                    src={item.url}
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                    muted
                  />
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                )}
                <s-button
                  variant="tertiary"
                  onClick={() => deleteMedia(item.id)}
                >
                  Remove
                </s-button>
              </s-stack>
            ))}
          </s-grid>
        </s-section>
      )}
    </s-page>
  );
}
