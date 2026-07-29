import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { buildInstagramAuthUrl } from "../instagram.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop || !shop.endsWith(".myshopify.com")) {
    throw new Response("Missing or invalid shop parameter", { status: 400 });
  }

  return redirect(buildInstagramAuthUrl(shop));
};
