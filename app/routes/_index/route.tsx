import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const params = new URL(request.url).searchParams;
  const fromShopify =
    params.has("shop") || params.has("host") || params.has("embedded");

  if (fromShopify) {
    throw redirect(`/app?${params.toString()}`);
  }

  throw redirect("/auth/login");
};

export default function Index() {
  return null;
}
