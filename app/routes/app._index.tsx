import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { getCachedPlanHandle } from "../plan-limits.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const planHandle = await getCachedPlanHandle(session.shop);
  const target = planHandle === "free" ? "/app/billing" : "/app/main-feed";
  throw redirect(`${target}${url.search}`);
};

export default function Index() {
  return null;
}
