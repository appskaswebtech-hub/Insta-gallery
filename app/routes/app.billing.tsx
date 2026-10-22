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
import styles from "../styles/billing.module.css";
import billingStyles from "../styles/billing.module.css?inline";

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

  const planAccentClass: Record<string, string> = {
    Free: styles.free,
    Basic: styles.basic,
    Pro: styles.pro,
  };

  return (
    <s-page heading="Billing" inlineSize="large">
      <style>{billingStyles}</style>
      <div className={styles.workspace}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Billing &amp; plans</h1>
            <p>Choose the plan that fits how much of your content you want to show.</p>
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
              <rect x="2" y="5" width="20" height="14" rx="3"></rect>
              <path d="M2 10h20"></path>
            </svg>
          </div>
        </header>

        {isDevelopmentStore && (
          <div className={styles.notice}>
            <div className={styles.noticeIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4M12 8h.01"></path>
              </svg>
            </div>
            <div className={styles.noticeCopy}>
              <h2>You're testing on a development store</h2>
              <p>
                Plans selected here are free to test and won't charge real
                money. Regular pricing applies once this store goes live.
              </p>
            </div>
          </div>
        )}

        {billingError ? (
          <div className={`${styles.notice} ${styles.criticalNotice}`}>
            <div className={styles.noticeIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v4M12 16h.01"></path>
              </svg>
            </div>
            <div className={styles.noticeCopy}>
              <h2>Could not verify your plan</h2>
              <p>{billingError}</p>
            </div>
          </div>
        ) : (
          <div className={styles.planSummary}>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryIcon} aria-hidden="true">
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
                  <path d="m9 12 2 2 4-4"></path>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
              <div>
                <div className={styles.summaryTitle}>
                  <span className={styles.summaryLabel}>Current plan</span>
                  <h2>{activePlan}</h2>
                  {activePlan !== "Free" && (
                    <span className={styles.activeBadge}>
                      <span aria-hidden="true" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className={styles.summaryDetails}>
              {activePlan === "Free"
                ? "Choose a plan to change how many posts can appear in your storefront gallery."
                : `Your ${activePlan} plan is active${periodEndLabel ? ` until ${periodEndLabel}` : ""}.`}
            </p>
          </div>
        )}

        <div className={styles.sectionHeading}>
          <h2>Available plans</h2>
          <p>Switch anytime — changes apply as soon as you confirm.</p>
        </div>

        <div className={styles.planGrid}>
          {plans.map((plan) => {
            const isCurrentPlan = activePlan === plan.name;
            const isSubmitting = fetcher.state !== "idle";
            return (
              <div
                key={plan.name}
                className={`${styles.planCard} ${planAccentClass[plan.name] ?? ""} ${
                  isCurrentPlan ? styles.currentPlan : ""
                }`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.planIcon} aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m12 2 3 7h7l-5.5 4.5L18.5 21 12 16.8 5.5 21l2-7.5L2 9h7Z"></path>
                    </svg>
                  </div>
                  {isCurrentPlan && (
                    <span className={styles.currentBadge}>Current plan</span>
                  )}
                </div>
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.priceLine}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>{plan.period}</span>
                </div>
                <p className={styles.description}>{plan.description}</p>
                <ul className={styles.features}>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <svg
                        viewBox="0 0 24 24"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m5 13 4 4L19 7"></path>
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.planForm}>
                  <fetcher.Form method="post">
                    <input type="hidden" name="plan" value={plan.handle} />
                    <button
                      type="submit"
                      className={`${styles.chooseButton} ${
                        isCurrentPlan
                          ? styles.currentButton
                          : plan.name === "Pro"
                            ? styles.primaryButton
                            : ""
                      }`}
                      disabled={isCurrentPlan || isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting && !isCurrentPlan && (
                        <span className={styles.spinner} aria-hidden="true" />
                      )}
                      {isCurrentPlan ? "Current plan" : `Choose ${plan.name}`}
                    </button>
                  </fetcher.Form>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PageFooter />
    </s-page>
  );
}
