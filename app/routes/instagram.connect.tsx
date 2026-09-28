import type { LoaderFunctionArgs } from "react-router";
// INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
// import { redirect } from "react-router";
// import { buildInstagramAuthUrl } from "../instagram.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
  // const url = new URL(request.url);
  // const shop = url.searchParams.get("shop");

  // if (!shop || !shop.endsWith(".myshopify.com")) {
  //   throw new Response("Missing or invalid shop parameter", { status: 400 });
  // }

  // return redirect(buildInstagramAuthUrl(shop));

  throw new Response("Instagram connect is temporarily unavailable", {
    status: 503,
  });
};
