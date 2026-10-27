import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { reopenThread } from "../support-chat.server";

// Merchant-initiated "Start New Chat" from the widget, after a closed thread.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  await reopenThread(session.shop);
  return data({ ok: true });
};
