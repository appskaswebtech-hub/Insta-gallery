import { useEffect, useRef } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app/custom-media">Custom media</s-link>
        <s-link href="/app/main-feed">Main feed</s-link>
        <s-link href="/app/settings">Settings</s-link>
        {/* ANALYTICS DISABLED FOR NOW - uncomment to re-enable
        <s-link href="/app/analytics">Analytics</s-link>
        */}
        
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();
  const containerRef = useRef<HTMLDivElement>(null);

  // boundary.error() injects Shopify's recovery markup (e.g. the App Bridge
  // bounce script) via dangerouslySetInnerHTML. Browsers never execute
  // <script> tags inserted that way, so App Bridge would silently fail to
  // load and the page would get stuck. Re-create any script tags so they
  // actually run.
  useEffect(() => {
    // Not embedded in the Admin iframe at all (e.g. the app's bare URL was
    // opened directly) - App Bridge has no parent frame to recover shop
    // context from, so send the user to the manual login form instead of
    // leaving a blank page.
    if (window.top === window.self) {
      window.location.href = "/auth/login";
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    container.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value),
      );
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });
  });

  return <div ref={containerRef}>{boundary.error(error)}</div>;
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
