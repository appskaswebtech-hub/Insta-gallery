import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await prisma.instagramPost.deleteMany({ where: { shop } });
  await prisma.instagramAccount.deleteMany({ where: { shop } });

  return new Response();
};
