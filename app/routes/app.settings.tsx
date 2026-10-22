import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { requireActivePlanForLiveStore } from "../billing-access.server";
import { getFeed, saveFeedDesignSettings } from "../feed.server";
import PageFooter from "../components/PageFooter";
import styles from "../styles/settings.module.css";
import settingsStyles from "../styles/settings.module.css?inline";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);
  const feed = await getFeed(session.shop);

  return {
    settings: {
      showLoadingAnimation: feed?.showLoadingAnimation ?? false,
      linkToOriginalPost: feed?.linkToOriginalPost ?? false,
      showSliderPreviews: feed?.showSliderPreviews ?? false,
      autoShowNewPosts: feed?.autoShowNewPosts ?? true,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);
  const formData = await request.formData();

  await saveFeedDesignSettings(session.shop, {
    showLoadingAnimation: formData.get("showLoadingAnimation") === "true",
    linkToOriginalPost: formData.get("linkToOriginalPost") === "true",
    showSliderPreviews: formData.get("showSliderPreviews") === "true",
    autoShowNewPosts: formData.get("autoShowNewPosts") === "true",
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
    <div className={styles.row}>
      <div className={styles.rowInfo}>
        <div className={styles.rowIcon} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconPath} />
          </svg>
        </div>
        <div className={styles.rowCopy}>
          <h2>{heading}</h2>
          <p>
            <strong>{label}</strong>
          </p>
          <p>{details}</p>
        </div>
      </div>
      <s-switch checked={checked} onChange={onChange}></s-switch>
    </div>
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
        autoShowNewPosts: String(settings.autoShowNewPosts),
        [name]: String(!currentValue),
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Settings" inlineSize="large">
      <style>{settingsStyles}</style>
      <div className={styles.workspace}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Fine-tune the experience</h1>
            <p>
              Control how your media feed behaves on the storefront. Changes
              apply immediately, no need to republish your theme.
            </p>
          </div>
          <div className={styles.pageMark} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"></path>
            </svg>
          </div>
        </header>

        <div className={styles.panel}>
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

          <SettingRow
            iconPath="M12 5v14M5 12h14"
            heading="New posts"
            label="Show new Instagram posts automatically after syncing"
            details="Turn this off to review and approve each newly synced post before it appears on your storefront."
            checked={settings.autoShowNewPosts}
            onChange={() =>
              toggle("autoShowNewPosts", settings.autoShowNewPosts)
            }
          />
        </div>
      </div>

      <PageFooter />
    </s-page>
  );
}
