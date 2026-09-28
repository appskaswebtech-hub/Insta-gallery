import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const params = new URL(request.url).searchParams;

  // Forward into the app when Shopify context is present in the URL.
  if (
    params.has("shop") ||
    params.has("host") ||
    params.has("embedded")
  ) {
    throw redirect(`/app/custom-media?${params.toString()}`);
  }

  // Otherwise leave this as a plain page - a bare direct visit to the app's
  // root URL shouldn't bounce anywhere.
  return null;
};

export default function Index() {
  useEffect(() => {
    // Admin's own app-title click can land here with no query params even
    // though we're genuinely embedded in its iframe. In that case, forward
    // into the app so it can recover the session via App Bridge.
    if (window.top !== window.self) {
      window.location.href = "/app/custom-media";
    }
  }, []);

  return null;
}
