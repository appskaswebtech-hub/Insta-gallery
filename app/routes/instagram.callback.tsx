import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { completeInstagramConnection, syncInstagramPosts } from "../instagram.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return redirect(`/app?instagram=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !shop) {
    throw new Response("Missing code or state from Instagram callback", {
      status: 400,
    });
  }

  await completeInstagramConnection(shop, code);
  await syncInstagramPosts(shop);

  return redirect(`/app?shop=${encodeURIComponent(shop)}&instagram=connected`);
};
