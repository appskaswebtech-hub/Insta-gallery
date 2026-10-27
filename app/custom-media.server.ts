import prisma from "./db.server";

export function getCustomMedia(shop: string) {
  return prisma.customMedia.findMany({
    where: { shop },
    orderBy: { position: "asc" },
  });
}

export async function getVisibleCustomMedia(shop: string) {
  const items = await prisma.customMedia.findMany({
    where: { shop, hidden: false },
    orderBy: { position: "asc" },
  });
  return [...items].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position,
  );
}

export async function addCustomMedia(
  shop: string,
  input: { mediaType: string; url: string; caption?: string },
) {
  const count = await prisma.customMedia.count({ where: { shop } });

  return prisma.customMedia.create({
    data: { shop, ...input, position: count },
  });
}

export function deleteCustomMedia(shop: string, id: string) {
  return prisma.customMedia.deleteMany({ where: { shop, id } });
}

export function setCustomMediaPinned(shop: string, id: string, pinned: boolean) {
  return prisma.customMedia.updateMany({ where: { shop, id }, data: { pinned } });
}

export function setCustomMediaHidden(shop: string, id: string, hidden: boolean) {
  return prisma.customMedia.updateMany({ where: { shop, id }, data: { hidden } });
}

export async function reorderCustomMedia(shop: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.customMedia.updateMany({
        where: { shop, id },
        data: { position: index },
      }),
    ),
  );
}

export async function moveCustomMedia(
  shop: string,
  id: string,
  direction: "up" | "down",
) {
  const items = await prisma.customMedia.findMany({
    where: { shop },
    orderBy: { position: "asc" },
  });
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swapWith = items[swapIndex];

  await prisma.$transaction([
    prisma.customMedia.update({
      where: { id: current.id },
      data: { position: swapWith.position },
    }),
    prisma.customMedia.update({
      where: { id: swapWith.id },
      data: { position: current.position },
    }),
  ]);
}
