import prisma from "./db.server";

export const PLAN_POST_LIMITS: Record<string, number> = {
  free: 5,
  basic: 25,
  pro: Infinity,
};

export function getPostLimitForPlan(planHandle: string) {
  return PLAN_POST_LIMITS[planHandle] ?? PLAN_POST_LIMITS.free;
}

export async function getCachedPlanHandle(shop: string) {
  const record = await prisma.shopPlan.findUnique({ where: { shop } });
  return record?.planHandle ?? "free";
}

export function setCachedPlanHandle(shop: string, planHandle: string) {
  return prisma.shopPlan.upsert({
    where: { shop },
    create: { shop, planHandle },
    update: { planHandle },
  });
}
