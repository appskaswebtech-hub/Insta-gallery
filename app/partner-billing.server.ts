const PARTNER_API_VERSION = "2026-07";
// This is the app handle used in Shopify Admin and Shopify App Pricing URLs.
// Keep it aligned with the `handle` in shopify.app.toml; do not derive it from
// an environment variable that can be confused with plan handles (free/basic/pro).
const SHOPIFY_APP_HANDLE = "instagallery-4";

export interface ActiveShopSubscription {
  items: Array<{ handle: string }>;
  currentBillingCycle: { endTime: string } | null;
  cancelAtEndOfCycle: boolean;
}

export function getAppPricingHandle() {
  return SHOPIFY_APP_HANDLE;
}

export function getPartnerBillingConfig() {
  const organizationId = process.env.SHOPIFY_PARTNER_ORG_ID;
  const accessToken = process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN;
  const appId = process.env.SHOPIFY_APP_GID;
  const appHandle = getAppPricingHandle();

  if (!organizationId || !accessToken || !appId || !appHandle) {
    return null;
  }

  return { organizationId, accessToken, appId, appHandle };
}

export async function getActiveShopSubscription(
  shopId: string,
): Promise<ActiveShopSubscription | null> {
  const config = getPartnerBillingConfig();
  if (!config) {
    throw new Error("Shopify Partner API billing is not configured");
  }

  const response = await fetch(
    `https://partners.shopify.com/${config.organizationId}/api/${PARTNER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.accessToken,
      },
      body: JSON.stringify({
        query: `query ActiveSubscription($appId: ID!, $shopId: ID!) {
          activeSubscription(appId: $appId, shopId: $shopId) {
            cancelAtEndOfCycle
            currentBillingCycle { endTime }
            items { handle }
          }
        }`,
        variables: { appId: config.appId, shopId },
      }),
    },
  );

  const result = (await response.json()) as {
    data?: { activeSubscription: ActiveShopSubscription | null };
    errors?: Array<{ message: string }>;
  };

  if (!response.ok) {
    const hint = response.status === 403
      ? "Check that the Partner API client has Manage apps permission and belongs to the configured organization."
      : response.status === 401
        ? "Check that the Partner API access token is valid."
        : "Check the Partner API credentials and app/shop IDs.";
    throw new Error(`Partner API returned ${response.status}. ${hint}`);
  }

  if (result.errors?.length) {
    throw new Error(
      `Partner API query failed: ${result.errors.map((error) => error.message).join("; ")}`,
    );
  }

  if (!result.data) {
    throw new Error("Partner API returned no subscription data.");
  }

  return result.data.activeSubscription;
}
