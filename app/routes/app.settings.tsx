import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getFeed, saveFeedDesignSettings } from "../feed.server";
import PageFooter from "../components/PageFooter";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const feed = await getFeed(session.shop);

  return {
    settings: {
      showLoadingAnimation: feed?.showLoadingAnimation ?? false,
      linkToOriginalPost: feed?.linkToOriginalPost ?? false,
      showSliderPreviews: feed?.showSliderPreviews ?? false,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  await saveFeedDesignSettings(session.shop, {
    showLoadingAnimation: formData.get("showLoadingAnimation") === "true",
    linkToOriginalPost: formData.get("linkToOriginalPost") === "true",
    showSliderPreviews: formData.get("showSliderPreviews") === "true",
  });

  return { saved: true };
};

function SettingRow({
  iconPath,
  heading,
  label,
  details,
  checked,
  onChange,
}: {
  iconPath: string;
  heading: string;
  label: string;
  details: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <s-section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, #6b6f76, #4a4d52 55%, #2e3033)",
              boxShadow: "0 3px 10px rgba(0, 0, 0, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={iconPath}></path>
            </svg>
          </div>
          <s-stack direction="block" gap="small-200">
            <s-heading>{heading}</s-heading>
            <s-text type="strong">{label}</s-text>
            <s-text color="subdued">{details}</s-text>
          </s-stack>
        </div>
        <s-switch checked={checked} onChange={onChange}></s-switch>
      </div>
    </s-section>
  );
}

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.saved) {
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.data, shopify]);

  const toggle = (name: string, currentValue: boolean) => {
    fetcher.submit(
      {
        showLoadingAnimation: String(settings.showLoadingAnimation),
        linkToOriginalPost: String(settings.linkToOriginalPost),
        showSliderPreviews: String(settings.showSliderPreviews),
        [name]: String(!currentValue),
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Settings">
      <s-section>
        <s-banner heading="Fine-tune the experience" tone="info">
          These settings control how your media feed behaves on the
          storefront - loading, popups, and sliders. Changes apply
          immediately, no need to republish your theme.
        </s-banner>
      </s-section>

      <SettingRow
        iconPath="M12 2a10 10 0 1 0 10 10M12 6v6l4 2"
        heading="Loading behavior"
        label="Show feed loading animation"
        details="Show an animation when loading the feed. Recommended when the feed is on the top of the page."
        checked={settings.showLoadingAnimation}
        onChange={() =>
          toggle("showLoadingAnimation", settings.showLoadingAnimation)
        }
      />

      <SettingRow
        iconPath="M14 4h6v6M10 14 20 4M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
        heading="Popup behavior"
        label="Show link to the original media on popup"
        details="Adds a link to open the original photo or video file inside the popup."
        checked={settings.linkToOriginalPost}
        onChange={() =>
          toggle("linkToOriginalPost", settings.linkToOriginalPost)
        }
      />

      <SettingRow
        iconPath="M4 4h6v16H4zM14 4h6v16h-6z"
        heading="Slider behavior"
        label="Show part of next and previous post in sliders"
        details="Display part of the next and previous post at the edges of the slider."
        checked={settings.showSliderPreviews}
        onChange={() =>
          toggle("showSliderPreviews", settings.showSliderPreviews)
        }
      />

      <PageFooter />
    </s-page>
  );
}
