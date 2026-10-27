import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { getMessages, markRead, sendMessage } from "../support-chat.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { thread, messages } = await getMessages(session.shop);
  if (new URL(request.url).searchParams.get("seen") === "1") {
    await markRead(session.shop, "shop");
  }
  return data({ thread, messages });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const body = formData.get("body");
  const file = formData.get("file");

  try {
    const message = await sendMessage({
      shop: session.shop,
      sender: "shop",
      body: typeof body === "string" ? body : null,
      file: file instanceof File ? file : null,
    });
    return data({ message });
  } catch (error) {
    return data(
      { error: error instanceof Error ? error.message : "Could not send message." },
      { status: 400 }
    );
  }
};
