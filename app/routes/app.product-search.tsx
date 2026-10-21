import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { searchShopifyProducts } from "../product-tags.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  const products = await searchShopifyProducts(admin, query);
  return { products };
};
