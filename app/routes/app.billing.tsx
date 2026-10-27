import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  cancelAppSubscription,
  createAppSubscription,
  getCurrentSubscription,
} from "../billing.server";
import { setCachedPlanHandle } from "../plan-limits.server";
import PageFooter from "../components/PageFooter";

const plans = [
  {
    name: "Free",
    handle: "free",
    price: "$0",
    priceAmount: "0",
    period: "forever",
    description: "A simple way to get started with your Instagram gallery.",
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
    priceAmount: "2.99",
    period: "per month",
    description: "More room to show your products and your latest content.",
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
    priceAmount: "4.99",
    period: "per month",
    description: "Show your full media library on your storefront.",
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

function planNameFromSubscriptionName(name: string) {
  const match = plans.find((plan) => name.endsWith(plan.name));
  return match?.name ?? "Free";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const requestUrl = new URL(request.url);
  const checkoutError = requestUrl.searchParams.get("checkout_error");

  let isDevelopmentStore = false;
  try {
    const shopResponse = await admin.graphql(`#graphql
      query BillingShopDetails {
        shop {
          plan { partnerDevelopment }
        }
      }
    `);
    const shopResult = (await shopResponse.json()) as {
      data?: { shop: { plan: { partnerDevelopment: boolean } } };
    };
    isDevelopmentStore = shopResult.data?.shop.plan.partnerDevelopment ?? false;
  } catch (error) {
    console.error("Could not look up shop type for billing:", error);
  }

  try {
    const subscription = await getCurrentSubscription(admin);
    const activePlan = subscription
      ? planNameFromSubscriptionName(subscription.name)
      : "Free";

    // Plan lookup is authoritative for this page. Keep a cache write failure
    // (for example, a stale Prisma Client or missing ShopPlan table) from
    // making a valid Shopify subscription look unverifiable to the merchant.
    try {
      await setCachedPlanHandle(session.shop, activePlan.toLowerCase());
    } catch (cacheError) {
      console.error("Could not cache the resolved billing plan:", cacheError);
    }

    return {
      activePlan,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      billingError: checkoutError,
      billingUpdated: requestUrl.searchParams.has("plan_handle"),
      isDevelopmentStore,
      requiresBilling: isDevelopmentStore === false && !subscription,
    };
  } catch (error) {
    console.error("Billing subscription lookup failed:", error);
    return {
      activePlan: null,
      currentPeriodEnd: null,
      billingError:
        checkoutError ??
        (error instanceof Error ? error.message : "Could not verify your plan."),
      billingUpdated: false,
      isDevelopmentStore,
      requiresBilling: isDevelopmentStore === false,
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, redirect } = await authenticate.admin(request);
  const formData = await request.formData();
  const planHandle = String(formData.get("plan") ?? "");
  const plan = plans.find((item) => item.handle === planHandle);

  if (!plan) return { error: "Unknown plan selected." };

  try {
    if (plan.handle === "free") {
      const current = await getCurrentSubscription(admin);
      if (current) {
        await cancelAppSubscription(admin, current.id);
      }
      await setCachedPlanHandle(session.shop, "free");
      throw redirect(`/app/billing?plan_handle=free`);
    }

    let isDevelopmentStore = false;
    try {
      const shopResponse = await admin.graphql(`#graphql
        query BillingShopPlan {
          shop {
            plan { partnerDevelopment }
          }
        }
      `);
      const shopResult = (await shopResponse.json()) as {
        data?: { shop: { plan: { partnerDevelopment: boolean } } };
      };
      isDevelopmentStore = shopResult.data?.shop.plan.partnerDevelopment ?? false;
    } catch (error) {
      console.error("Could not look up shop type before creating subscription:", error);
    }

    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!apiKey) {
      throw new Error("SHOPIFY_API_KEY is not configured on the server.");
    }

    // Return to the embedded app through Shopify Admin after approval. A bare
    // app-host URL loses Shopify's embedded-app context and can land on a blank
    // page when Shopify completes the charge confirmation.
    const storeHandle = session.shop.replace(/\.myshopify\.com$/, "");
    const returnUrl = new URL(
      `/store/${storeHandle}/apps/${apiKey}/app/billing`,
      "https://admin.shopify.com",
    );
    returnUrl.searchParams.set("plan_handle", plan.handle);

    const confirmationUrl = await createAppSubscription(admin, {
      name: `InstaGallery ${plan.name}`,
      price: plan.priceAmount,
      returnUrl: returnUrl.toString(),
      test: isDevelopmentStore,
    });

    return { confirmationUrl };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Could not start checkout for plan:", plan.handle, error);
    return {
      error: error instanceof Error ? error.message : "Could not start checkout.",
    };
  }
};

export default function Billing() {
  const {
    activePlan,
    currentPeriodEnd,
    billingError,
    billingUpdated,
    isDevelopmentStore,
  } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const fetcher = useFetcher<typeof action>();

  useEffect(() => {
    const confirmationUrl = fetcher.data && "confirmationUrl" in fetcher.data
      ? fetcher.data.confirmationUrl
      : null;
    if (!confirmationUrl) return;

    if (window.top) window.top.location.href = confirmationUrl;
    else window.location.href = confirmationUrl;
  }, [fetcher.data]);

  useEffect(() => {
    if (fetcher.data && "error" in fetcher.data && fetcher.data.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

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
          <s-banner heading="You're testing on a development store" tone="info">
            Plans selected here are free to test and won't charge real money.
            Regular pricing applies once this store goes live.
          </s-banner>
        </s-section>
      )}
      {billingError ? (
        <s-section>
          <s-banner heading="Could not verify your plan" tone="critical">
            {billingError}
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
            const isSubmitting = fetcher.state !== "idle";
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
                      disabled={isCurrentPlan || isSubmitting}
                      {...(isSubmitting ? { loading: true } : {})}
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
