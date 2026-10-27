import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

// Shopify Admin sometimes navigates here directly (appending /login to the
// app's current mounted path) when it decides the app needs to reauthenticate,
// even though our actual login route lives at /auth/login. Forward it there
// instead of letting it 404.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  throw redirect(`/auth/login?${url.searchParams.toString()}`);
};

export default function AppLogin() {
  return null;
}
