import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const params = new URL(request.url).searchParams;

  // Always forward into /app/custom-media, even with no shop/host params.
  // authenticate.admin() there will establish the session itself, using the
  // library's built-in App Bridge bounce when context is missing, instead of
  // us guessing and bouncing to the manual login form ourselves.
  throw redirect(`/app/custom-media?${params.toString()}`);
};

export default function Index() {
  return null;
}
