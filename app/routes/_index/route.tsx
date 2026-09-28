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

  return null;
};

export default function Index() {
  useEffect(() => {
    if (window.top !== window.self) {
      // Admin's own app-title click can land here with no query params even
      // though we're genuinely embedded in its iframe. Forward into the app
      // so it can recover the session via App Bridge.
      window.location.href = "/app/custom-media";
    } else {
      // A bare, standalone visit with no Shopify context at all - show the
      // login form instead of a blank page.
      window.location.href = "/auth/login";
    }
  }, []);

  return null;
}
