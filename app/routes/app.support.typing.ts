import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { notifyDashboard } from "../support-chat.server";

// Fires when the merchant is actively typing in the chat widget, so the
// admin dashboard can show a live "typing..." indicator. Not persisted
// anywhere -- just a fire-and-forget signal to Supportly.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  void notifyDashboard(session.shop, { type: "typing" }).catch((error: unknown) => {
    console.error("Could not notify Supportly about merchant typing.", error);
  });
  return data({ ok: true });
};
