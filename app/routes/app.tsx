import { useEffect, useRef, useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Outlet,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

// The App Bridge script tag loads asynchronously and sets window.shopify
// once ready. Pages calling useAppBridge() before that finishes crash with
// "The shopify global is not defined" - wait for it before rendering them.
// Falls back to rendering anyway after 4s so a slow/blocked script can't
// leave the page stuck blank forever.
function useAppBridgeReady() {
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && Boolean((window as any).shopify),
  );

  useEffect(() => {
    if (ready) return;

    const interval = setInterval(() => {
      if ((window as any).shopify) {
        setReady(true);
      }
    }, 50);

    const timeout = setTimeout(() => setReady(true), 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [ready]);

  return ready;
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const appBridgeReady = useAppBridgeReady();

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
      {appBridgeReady ? (
        <Outlet />
      ) : (
        <s-page>
          <s-spinner></s-spinner>
        </s-page>
      )}
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();
  const containerRef = useRef<HTMLDivElement>(null);

  // boundary.error() detects Shopify's thrown responses by checking
  // error.constructor.name === 'ErrorResponse', which breaks once the
  // production build minifies class names (the check silently fails and it
  // re-throws, leaving React Router's bare default fallback showing nothing
  // but the raw status code). Use React Router's own minification-safe
  // isRouteErrorResponse() instead.
  const html = isRouteErrorResponse(error)
    ? (error.data as string) || "Handling response"
    : null;

  // The recovered markup (e.g. the App Bridge bounce script) is injected via
  // dangerouslySetInnerHTML. Browsers never execute <script> tags inserted
  // that way, so App Bridge would silently fail to load and the page would
  // get stuck. Re-create any script tags so they actually run.
  useEffect(() => {
    if (html === null) return;

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

  if (html === null) {
    throw error;
  }

  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />;
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
