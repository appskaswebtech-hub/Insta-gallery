import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getFeed, saveFeedDesignSettings } from "../feed.server";

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
      <s-section heading="Design">
        <s-stack direction="block" gap="base">
          <s-switch
            label="Show feed loading animation"
            details="Show an animation when loading the feed. Recommended when the feed is on the top of the page."
            checked={settings.showLoadingAnimation}
            onChange={() =>
              toggle("showLoadingAnimation", settings.showLoadingAnimation)
            }
          ></s-switch>

          <s-switch
            label="Show link to the Instagram post on popup"
            details="Adds a link to the original Instagram post inside the popup."
            checked={settings.linkToOriginalPost}
            onChange={() =>
              toggle("linkToOriginalPost", settings.linkToOriginalPost)
            }
          ></s-switch>

          <s-switch
            label="Show part of next and previous post in sliders"
            details="Display part of the next and previous post at the edges of the slider."
            checked={settings.showSliderPreviews}
            onChange={() =>
              toggle("showSliderPreviews", settings.showSliderPreviews)
            }
          ></s-switch>
        </s-stack>
      </s-section>
    </s-page>
  );
}
