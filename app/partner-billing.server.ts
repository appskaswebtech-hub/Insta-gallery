const PARTNER_API_VERSION = "2026-07";

export interface ActiveShopSubscription {
  items: Array<{ handle: string }>;
  currentBillingCycle: { endTime: string } | null;
  cancelAtEndOfCycle: boolean;
}

export function getAppPricingHandle() {
  return process.env.SHOPIFY_APP_HANDLE || null;
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

  if (!response.ok || result.errors?.length || !result.data) {
    throw new Error(
      `Shopify Partner API subscription lookup failed (${response.status})`,
    );
  }

  return result.data.activeSubscription;
}
