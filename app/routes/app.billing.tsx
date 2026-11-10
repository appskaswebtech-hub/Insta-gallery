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
import { resolveLocale, getDictionary, getPlanFeatures } from "../i18n/resolve.server";
import { interpolate } from "../i18n/format";
import PageFooter from "../components/PageFooter";
import styles from "../styles/billing.module.css";
import billingStyles from "../styles/billing.module.css?inline";

// Stable, English-only identifiers used for Shopify subscription names and
// matching - never translated, since changing a subscription's name per
// locale would break matching against subscriptions merchants already have.
const PLAN_CONFIG = [
  { handle: "free", legacyName: "Free", price: "$0", priceAmount: "0" },
  { handle: "basic", legacyName: "Basic", price: "$2.99", priceAmount: "2.99" },
  { handle: "pro", legacyName: "Pro", price: "$4.99", priceAmount: "4.99" },
] as const;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function planHandleFromSubscriptionName(name: string) {
  const match = PLAN_CONFIG.find((plan) => name.endsWith(plan.legacyName));
  return match?.handle ?? "free";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const requestUrl = new URL(request.url);
  const checkoutError = requestUrl.searchParams.get("checkout_error");
  const locale = await resolveLocale(session.shop, request);
  const t = getDictionary<Record<string, string>>(locale, "billing");
  const tc = getDictionary(locale, "common");

  const localizedPlans = PLAN_CONFIG.map((plan) => ({
    handle: plan.handle,
    price: plan.price,
    name: t[`plan${capitalize(plan.handle)}Name`],
    period: t[`plan${capitalize(plan.handle)}Period`],
    description: t[`plan${capitalize(plan.handle)}Description`],
    features: getPlanFeatures(locale, `plan${capitalize(plan.handle)}Features`),
  }));

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
    const activePlanHandle = subscription
      ? planHandleFromSubscriptionName(subscription.name)
      : "free";

    // Plan lookup is authoritative for this page. Keep a cache write failure
    // (for example, a stale Prisma Client or missing ShopPlan table) from
    // making a valid Shopify subscription look unverifiable to the merchant.
    try {
      await setCachedPlanHandle(session.shop, activePlanHandle);
    } catch (cacheError) {
      console.error("Could not cache the resolved billing plan:", cacheError);
    }

    return {
      activePlanHandle,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      billingError: checkoutError,
      billingUpdated: requestUrl.searchParams.has("plan_handle"),
      isDevelopmentStore,
      requiresBilling: isDevelopmentStore === false && !subscription,
      plans: localizedPlans,
      t,
      tc,
    };
  } catch (error) {
    console.error("Billing subscription lookup failed:", error);
    return {
      activePlanHandle: null,
      currentPeriodEnd: null,
      billingError: checkoutError ?? (error instanceof Error ? error.message : t.verifyPlanError),
      billingUpdated: false,
      isDevelopmentStore,
      requiresBilling: isDevelopmentStore === false,
      plans: localizedPlans,
      t,
      tc,
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, redirect } = await authenticate.admin(request);
  const formData = await request.formData();
  const planHandle = String(formData.get("plan") ?? "");
  const plan = PLAN_CONFIG.find((item) => item.handle === planHandle);
  const locale = await resolveLocale(session.shop, request);
  const t = getDictionary<Record<string, string>>(locale, "billing");

  if (!plan) return { error: t.unknownPlanError };

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
      name: `InstaGallery ${plan.legacyName}`,
      price: plan.priceAmount,
      returnUrl: returnUrl.toString(),
      test: isDevelopmentStore,
    });

    return { confirmationUrl };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Could not start checkout for plan:", plan.handle, error);
    return {
      error: error instanceof Error ? error.message : t.checkoutStartError,
    };
  }
};

export default function Billing() {
  const {
    activePlanHandle,
    currentPeriodEnd,
    billingError,
    billingUpdated,
    plans,
    t,
    tc,
  } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const fetcher = useFetcher<typeof action>();

  const activePlan = plans.find((plan) => plan.handle === activePlanHandle);

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
      shopify.toast.show(interpolate(t.toastPlanUpdated, { plan: activePlan.name }));
    }
  }, [activePlan, billingUpdated, shopify, t.toastPlanUpdated]);

  const periodEndLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString()
    : null;

  const planAccentClass: Record<string, string> = {
    free: styles.free,
    basic: styles.basic,
    pro: styles.pro,
  };

  return (
    <s-page heading={t.pageTitle} inlineSize="large">
      <style>{billingStyles}</style>
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
              <rect x="2" y="5" width="20" height="14" rx="3"></rect>
              <path d="M2 10h20"></path>
            </svg>
          </div>
        </header>

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
              <h2>{t.errorHeading}</h2>
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
                  <span className={styles.summaryLabel}>{t.currentPlanLabel}</span>
                  <h2>{activePlan?.name}</h2>
                  {activePlanHandle !== "free" && (
                    <span className={styles.activeBadge}>
                      <span aria-hidden="true" />
                      {t.activeBadge}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className={styles.summaryDetails}>
              {activePlanHandle === "free"
                ? t.summaryFreePrompt
                : periodEndLabel
                  ? interpolate(t.summaryActiveWithDate, {
                      plan: activePlan?.name ?? "",
                      date: periodEndLabel,
                    })
                  : interpolate(t.summaryActiveNoDate, {
                      plan: activePlan?.name ?? "",
                    })}
            </p>
          </div>
        )}

        <div className={styles.sectionHeading}>
          <h2>{t.availablePlansHeading}</h2>
          <p>{t.availablePlansSubtitle}</p>
        </div>

        <div className={styles.planGrid}>
          {plans.map((plan) => {
            const isCurrentPlan = activePlanHandle === plan.handle;
            const isSubmitting = fetcher.state !== "idle";
            return (
              <div
                key={plan.handle}
                className={`${styles.planCard} ${planAccentClass[plan.handle] ?? ""} ${
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
                    <span className={styles.currentBadge}>{t.currentPlanBadge}</span>
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
                          : plan.handle === "pro"
                            ? styles.primaryButton
                            : ""
                      }`}
                      disabled={isCurrentPlan || isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting && !isCurrentPlan && (
                        <span className={styles.spinner} aria-hidden="true" />
                      )}
                      {isCurrentPlan
                        ? t.currentPlanButton
                        : interpolate(t.chooseButton, { plan: plan.name })}
                    </button>
                  </fetcher.Form>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PageFooter text={tc.footerRights} />
    </s-page>
  );
}
