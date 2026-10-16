import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  getAppPricingHandle,
  getActiveShopSubscription,
  getPartnerBillingConfig,
} from "../partner-billing.server";
import PageFooter from "../components/PageFooter";

const plans = [
  {
    name: "Free",
    handle: "free",
    price: "$0",
    period: "forever",
    description: "A simple way to get started with your Instagram gallery.",
    posts: "Up to 5 posts",
    features: [
      "Up to 5 posts",
      "Grid, slider, or list layout",
      "Upload from your computer",
      "Add media via URL",
      "Sync your Instagram feed",
      "Basic style customization",
      "Community support",
    ],
  },
  {
    name: "Basic",
    handle: "basic",
    price: "$2.99",
    period: "per month",
    description: "More room to show your products and your latest content.",
    posts: "Up to 25 posts",
    features: [
      "Up to 25 posts",
      "All layout options",
      "Upload from computer, URL, or YouTube",
      "Full style customization",
      "Sync your Instagram feed",
      "Pin, hide, and reorder posts",
      "Email support",
    ],
  },
  {
    name: "Pro",
    handle: "pro",
    price: "$4.99",
    period: "per month",
    description: "Show your full media library on your storefront.",
    posts: "Unlimited posts",
    features: [
      "Unlimited posts",
      "All layout options",
      "Upload from computer, URL, or YouTube",
      "Full style customization",
      "Sync your Instagram feed",
      "Pin, hide, and reorder posts",
      "Priority support",
    ],
  },
];

function getPlanSelectionUrl(shop: string) {
  const appHandle = getAppPricingHandle();
  if (!appHandle) return null;

  const storeHandle = shop.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${encodeURIComponent(storeHandle)}/charges/${encodeURIComponent(appHandle)}/pricing_plans`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const planSelectionUrl = getPlanSelectionUrl(session.shop);
  const config = getPartnerBillingConfig();

  let shopId: string | null = null;
  let isDevelopmentStore: boolean | null = null;
  let shopLookupError: unknown = null;

  try {
    const shopResponse = await admin.graphql(`#graphql
      query BillingShopDetails {
        shop {
          id
          plan { partnerDevelopment }
        }
      }
    `);
    const shopResult = (await shopResponse.json()) as {
      data?: { shop: { id: string; plan: { partnerDevelopment: boolean } } };
      errors?: Array<{ message: string }>;
    };

    if (!shopResult.data?.shop.id || shopResult.errors?.length) {
      throw new Error("Could not look up the current Shopify shop for billing.");
    }

    shopId = shopResult.data.shop.id;
    isDevelopmentStore = shopResult.data.shop.plan.partnerDevelopment;
  } catch (error) {
    shopLookupError = error;
    console.error("Billing shop lookup failed:", error);
  }

  if (!config) {
    return {
      activePlan: null,
      currentPeriodEnd: null,
      billingConfigured: false,
      planSelectionUrl,
      billingError: null,
      billingUpdated: false,
      isDevelopmentStore,
      requiresBilling: isDevelopmentStore === false,
    };
  }

  try {
    if (shopLookupError) throw shopLookupError;
    if (!shopId) throw new Error("Could not look up the current Shopify shop for billing.");

    const subscription = await getActiveShopSubscription(shopId);
    const activePlan = subscription?.items.some((item) => item.handle === "pro")
      ? "Pro"
      : subscription?.items.some((item) => item.handle === "basic")
        ? "Basic"
        : "Free";

    return {
      activePlan,
      currentPeriodEnd: subscription?.currentBillingCycle?.endTime ?? null,
      billingConfigured: true,
      planSelectionUrl,
      billingError: null,
      billingUpdated: new URL(request.url).searchParams.has("plan_handle"),
      isDevelopmentStore,
      requiresBilling: isDevelopmentStore === false && !subscription,
    };
  } catch (error) {
    // Shopify's server helpers can throw Response-like objects as well as
    // Error instances. Preserve their useful status/message rather than
    // replacing them with a generic message (or rendering [object Object]).
    const details = error && typeof error === "object"
      ? error as { message?: unknown; status?: unknown; statusText?: unknown; errors?: unknown }
      : null;
    const messages = Array.isArray(details?.errors)
      ? details.errors
          .map((item) => item && typeof item === "object" && "message" in item
            ? String((item as { message: unknown }).message)
            : String(item))
          .join("; ")
      : "";
    let responseDetails = "";
    if (error instanceof Response) {
      try {
        responseDetails = (await error.clone().text()).slice(0, 500).trim();
      } catch {
        // The response body may already be unavailable; status is still useful.
      }
    }
    const billingError = error instanceof Error
      ? error.message
      : typeof details?.message === "string"
        ? details.message
        : typeof details?.status === "number"
          ? `Shopify billing request failed (${details.status}${details.statusText ? ` ${String(details.statusText)}` : ""})${responseDetails ? `: ${responseDetails}` : ". Check the server log for details."}`
          : messages || "Billing lookup failed with an unrecognized Shopify response. Check the server log for details.";
    console.error("Billing subscription lookup failed:", error);

    return {
      activePlan: null,
      currentPeriodEnd: null,
      billingConfigured: true,
      planSelectionUrl,
      billingError,
      billingUpdated: false,
      isDevelopmentStore,
      requiresBilling: isDevelopmentStore === false,
    };
  }
};

export default function Billing() {
  const {
    activePlan,
    currentPeriodEnd,
    billingConfigured,
    planSelectionUrl,
    billingError,
    billingUpdated,
    isDevelopmentStore,
  } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (billingUpdated && activePlan) {
      shopify.toast.show(`Billing plan updated to ${activePlan}`);
    }
  }, [activePlan, billingUpdated, shopify]);

  const periodEndLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <s-page heading="Billing">
      {isDevelopmentStore && (
        <s-section>
          <s-banner heading="Plan selection is for live stores" tone="warning">
            Development stores can use InstaGallery for testing. Choose a plan
            from a live Shopify store to continue to billing approval.
          </s-banner>
        </s-section>
      )}
      {!billingConfigured ? (
        <s-section>
          <s-banner heading="Billing setup is required" tone="warning">
            Shopify App Pricing needs Partner API credentials and plans configured
            in the Partner Dashboard before merchants can select a plan.
          </s-banner>
        </s-section>
      ) : billingError ? (
        <s-section>
          <s-banner heading="Could not verify your plan" tone="critical">
            {billingError}
          </s-banner>
        </s-section>
      ) : (
        <s-section>
          <s-banner heading={`Your current plan: ${activePlan}`} tone="info">
            {isDevelopmentStore
              ? "This development store is for testing. Plan selection is available on live stores."
              : activePlan === "Free"
              ? "Choose a plan to change how many posts can appear in your storefront gallery."
              : `Your ${activePlan} plan is active${periodEndLabel ? ` until ${periodEndLabel}` : ""}.`}
          </s-banner>
        </s-section>
      )}

      <s-section heading="Available plans">
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
          gap="base"
        >
          {plans.map((plan) => {
            const isCurrentPlan = activePlan === plan.name;
            return (
              <div
                key={plan.name}
                style={{
                  height: "100%",
                  boxSizing: "border-box",
                  padding: 24,
                  borderRadius: 16,
                  border: isCurrentPlan
                    ? "2px solid #30343b"
                    : "1px solid #d8dadd",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-heading>{plan.name}</s-heading>
                  {isCurrentPlan && <s-badge tone="success">Current plan</s-badge>}
                </s-stack>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 650 }}>{plan.price}</div>
                  <s-text color="subdued">{plan.period}</s-text>
                </div>
                <s-text color="subdued">{plan.description}</s-text>
                <s-divider></s-divider>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <span style={{ color: "#2e3033", flexShrink: 0 }}>
                        ✓
                      </span>
                      <s-text>{feature}</s-text>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "auto" }}>
                  <s-button
                    variant={plan.name === "Pro" ? "primary" : "secondary"}
                    disabled={isCurrentPlan || (!isDevelopmentStore && !planSelectionUrl)}
                    onClick={() => {
                      if (isDevelopmentStore) {
                        shopify.toast.show("Plan selection is available only on live Shopify stores.");
                        return;
                      }

                      if (planSelectionUrl) {
                        (window.top ?? window).location.assign(planSelectionUrl);
                      }
                    }}
                  >
                    {isCurrentPlan ? "Current plan" : `Choose ${plan.name}`}
                  </s-button>
                </div>
              </div>
            );
          })}
        </s-grid>
      </s-section>

      <PageFooter />
    </s-page>
  );
}
