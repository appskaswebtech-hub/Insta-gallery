import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { requireActivePlanForLiveStore } from "../billing-access.server";
import { getFeed, saveFeedDesignSettings } from "../feed.server";
import { resolveLocale, getDictionary } from "../i18n/resolve.server";
import { SUPPORTED_LOCALES } from "../i18n/locales";
import PageFooter from "../components/PageFooter";
import styles from "../styles/settings.module.css";
import settingsStyles from "../styles/settings.module.css?inline";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);
  const feed = await getFeed(session.shop);
  const locale = await resolveLocale(session.shop, request);
  const t = getDictionary(locale, "settings");
  const tc = getDictionary(locale, "common");

  return {
    t,
    tc,
    settings: {
      showLoadingAnimation: feed?.showLoadingAnimation ?? false,
      linkToOriginalPost: feed?.linkToOriginalPost ?? false,
      showSliderPreviews: feed?.showSliderPreviews ?? false,
      autoShowNewPosts: feed?.autoShowNewPosts ?? true,
      directInstagramRedirect: feed?.onPostClick === "redirect",
      language: feed?.language ?? "auto",
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  await requireActivePlanForLiveStore(admin, request);
  const formData = await request.formData();
  const language = String(formData.get("language") ?? "auto");

  await saveFeedDesignSettings(session.shop, {
    showLoadingAnimation: formData.get("showLoadingAnimation") === "true",
    linkToOriginalPost: formData.get("linkToOriginalPost") === "true",
    showSliderPreviews: formData.get("showSliderPreviews") === "true",
    autoShowNewPosts: formData.get("autoShowNewPosts") === "true",
    onPostClick:
      formData.get("directInstagramRedirect") === "true" ? "redirect" : "popup",
    language:
      language === "auto" || (SUPPORTED_LOCALES as readonly string[]).includes(language)
        ? language
        : "auto",
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
  const { settings, t, tc } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.saved) {
      shopify.toast.show(t.toastSaved);
    }
  }, [fetcher.data, shopify, t.toastSaved]);

  const toggle = (name: string, currentValue: boolean) => {
    fetcher.submit(
      {
        showLoadingAnimation: String(settings.showLoadingAnimation),
        linkToOriginalPost: String(settings.linkToOriginalPost),
        showSliderPreviews: String(settings.showSliderPreviews),
        autoShowNewPosts: String(settings.autoShowNewPosts),
        directInstagramRedirect: String(settings.directInstagramRedirect),
        language: settings.language,
        [name]: String(!currentValue),
      },
      { method: "POST" },
    );
  };

  const changeLanguage = (language: string) => {
    fetcher.submit(
      {
        showLoadingAnimation: String(settings.showLoadingAnimation),
        linkToOriginalPost: String(settings.linkToOriginalPost),
        showSliderPreviews: String(settings.showSliderPreviews),
        autoShowNewPosts: String(settings.autoShowNewPosts),
        directInstagramRedirect: String(settings.directInstagramRedirect),
        language,
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading={t.pageTitle} inlineSize="large">
      <style>{settingsStyles}</style>
      <div className={styles.workspace}>
        <header className={styles.pageHeader}>
          <div>
            <h1>{t.heroHeading}</h1>
            <p>{t.heroSubtitle}</p>
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
            heading={t.loadingHeading}
            label={t.loadingLabel}
            details={t.loadingDetails}
            checked={settings.showLoadingAnimation}
            onChange={() =>
              toggle("showLoadingAnimation", settings.showLoadingAnimation)
            }
          />

          <SettingRow
            iconPath="M14 4h6v6M10 14 20 4M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
            heading={t.popupHeading}
            label={t.popupLabel}
            details={t.popupDetails}
            checked={settings.linkToOriginalPost}
            onChange={() =>
              toggle("linkToOriginalPost", settings.linkToOriginalPost)
            }
          />

          <SettingRow
            iconPath="M4 4h6v16H4zM14 4h6v16h-6z"
            heading={t.sliderHeading}
            label={t.sliderLabel}
            details={t.sliderDetails}
            checked={settings.showSliderPreviews}
            onChange={() =>
              toggle("showSliderPreviews", settings.showSliderPreviews)
            }
          />

          <SettingRow
            iconPath="M12 5v14M5 12h14"
            heading={t.newPostsHeading}
            label={t.newPostsLabel}
            details={t.newPostsDetails}
            checked={settings.autoShowNewPosts}
            onChange={() =>
              toggle("autoShowNewPosts", settings.autoShowNewPosts)
            }
          />

          <SettingRow
            iconPath="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"
            heading={t.redirectHeading}
            label={t.redirectLabel}
            details={t.redirectDetails}
            checked={settings.directInstagramRedirect}
            onChange={() =>
              toggle(
                "directInstagramRedirect",
                settings.directInstagramRedirect,
              )
            }
          />

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
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"></path>
                </svg>
              </div>
              <div className={styles.rowCopy}>
                <h2>{t.languageHeading}</h2>
                <p>
                  <strong>{t.languageLabel}</strong>
                </p>
                <p>{t.languageDetails}</p>
              </div>
            </div>
            <s-select
              label={t.languageLabel}
              labelAccessibilityVisibility="exclusive"
              value={settings.language}
              onChange={(event) => changeLanguage(event.currentTarget.value)}
            >
              <s-option value="auto">{t.languageOptionAuto}</s-option>
              <s-option value="en">{t.languageOptionEn}</s-option>
              <s-option value="de">{t.languageOptionDe}</s-option>
              <s-option value="es">{t.languageOptionEs}</s-option>
              <s-option value="fr">{t.languageOptionFr}</s-option>
              <s-option value="it">{t.languageOptionIt}</s-option>
            </s-select>
          </div>
        </div>
      </div>

      <PageFooter text={tc.footerRights} />
    </s-page>
  );
}
