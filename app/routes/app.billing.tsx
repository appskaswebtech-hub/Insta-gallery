import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const config = getPartnerBillingConfig();

  if (!config) {
    return {
      activePlan: null,
      currentPeriodEnd: null,
      billingConfigured: false,
      canChoosePlan: Boolean(getAppPricingHandle()),
      billingUpdated: false,
    };
  }

  const shopResponse = await admin.graphql(`#graphql
    query BillingShopId {
      shop { id }
    }
  `);
  const shopResult = (await shopResponse.json()) as {
    data?: { shop: { id: string } };
    errors?: Array<{ message: string }>;
  };

  if (!shopResult.data?.shop.id || shopResult.errors?.length) {
    throw new Error("Could not look up the current Shopify shop for billing");
  }

  const subscription = await getActiveShopSubscription(shopResult.data.shop.id);
  const activePlan = subscription?.items.some((item) => item.handle === "pro")
    ? "Pro"
    : subscription?.items.some((item) => item.handle === "basic")
      ? "Basic"
      : "Free";

  return {
    activePlan,
    currentPeriodEnd: subscription?.currentBillingCycle?.endTime ?? null,
    billingConfigured: true,
    canChoosePlan: true,
    billingUpdated: new URL(request.url).searchParams.has("plan_handle"),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, redirect } = await authenticate.admin(request);
  const appHandle = getAppPricingHandle();
  const formData = await request.formData();
  const plan = String(formData.get("plan") ?? "");

  if (!plans.some((item) => item.handle === plan) || !appHandle) {
    throw new Response("Billing plans are not configured for this app", {
      status: 400,
    });
  }

  const storeHandle = session.shop.replace(/\.myshopify\.com$/, "");
  const pricingUrl = `https://admin.shopify.com/store/${encodeURIComponent(storeHandle)}/charges/${encodeURIComponent(appHandle)}/pricing_plans`;
  return redirect(pricingUrl, { target: "_top" });
};

export default function Billing() {
  const {
    activePlan,
    currentPeriodEnd,
    billingConfigured,
    canChoosePlan,
    billingUpdated,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const isSubmitting = ["loading", "submitting"].includes(fetcher.state);

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
      {!billingConfigured ? (
        <s-section>
          <s-banner heading="Billing setup is required" tone="warning">
            Shopify App Pricing needs Partner API credentials and plans configured
            in the Partner Dashboard before merchants can select a plan.
          </s-banner>
        </s-section>
      ) : (
        <s-section>
          <s-banner heading={`Your current plan: ${activePlan}`} tone="info">
            {activePlan === "Free"
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
                  <fetcher.Form method="post">
                    <input type="hidden" name="plan" value={plan.handle} />
                    <s-button
                      type="submit"
                      variant={plan.name === "Pro" ? "primary" : "secondary"}
                      disabled={!canChoosePlan || isCurrentPlan || isSubmitting}
                      {...(isSubmitting && !isCurrentPlan ? { loading: true } : {})}
                    >
                      {isCurrentPlan ? "Current plan" : `Choose ${plan.name}`}
                    </s-button>
                  </fetcher.Form>
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
