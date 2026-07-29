import prisma from "./db.server";

export function getCustomMedia(shop: string) {
  return prisma.customMedia.findMany({
    where: { shop },
    orderBy: { position: "asc" },
  });
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
