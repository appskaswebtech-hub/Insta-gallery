import { redirect } from "react-router";
import {
  getActiveShopSubscription,
  getPartnerBillingConfig,
} from "./partner-billing.server";

type AdminGraphqlClient = {
  graphql: (query: string) => Promise<{ json(): Promise<unknown> }>;
};

export async function requireActivePlanForLiveStore(
  admin: AdminGraphqlClient,
  request: Request,
) {
  const url = new URL(request.url);
  const billingUrl = `/app/billing${url.search}`;

  let shopId: string;
  try {
    const shopResponse = await admin.graphql(`#graphql
      query BillingAccessShop {
        shop {
          id
          plan { partnerDevelopment }
        }
      }
    `);
    const result = (await shopResponse.json()) as {
      data?: { shop: { id: string; plan: { partnerDevelopment: boolean } } };
      errors?: Array<{ message: string }>;
    };

    if (result.errors?.length || !result.data?.shop.id) {
      throw new Error("Could not verify the shop type for billing access.");
    }

    if (result.data.shop.plan.partnerDevelopment) return;
    shopId = result.data.shop.id;
  } catch (error) {
    // If Shopify can't confirm the shop type, allow the request so a temporary
    // Admin API issue doesn't lock development stores out of the app.
    console.error("Could not check shop type for billing access:", error);
    return;
  }

  const config = getPartnerBillingConfig();
  if (!config) throw redirect(billingUrl);

  try {
    const subscription = await getActiveShopSubscription(shopId);
    if (subscription) return;
  } catch (error) {
    console.error("Could not verify active subscription for app access:", error);
  }

  throw redirect(billingUrl);
}
