import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";

// Called by Supportly after an admin reply, a typing event, or a reset --
// it has already written the change directly into our own SupportThread/
// SupportMessage tables (see Supportly's embeddedChat.service.ts), so this
// endpoint has nothing left to persist. It exists only because Supportly
// always pings an app's registered appUrl after that write; our widget
// picks the change up on its next poll of /app/support/messages regardless,
// so this just needs to answer with 200 so Supportly doesn't log a warning.
export const action = async ({ request }: ActionFunctionArgs) => {
  const secret = process.env.SUPPORT_INTERNAL_SECRET;
  if (!secret || request.headers.get("x-internal-secret") !== secret) {
    return data({ error: "Forbidden" }, { status: 403 });
  }
  return data({ ok: true });
};
