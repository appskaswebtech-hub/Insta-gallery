import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const params = new URL(request.url).searchParams;

  if (
    params.has("shop") ||
    params.has("host") ||
    params.has("embedded")
  ) {
    throw redirect(`/app/custom-media?${params.toString()}`);
  }

  throw redirect("/auth/login");
};

export default function Index() {
  return null;
}
