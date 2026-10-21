import prisma from "./db.server";

export function canUseProductTagging(planHandle: string) {
  return planHandle === "basic" || planHandle === "pro";
}

interface ShopifyAdminClient {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
}

export interface ProductSearchResult {
  id: string;
  handle: string;
  title: string;
  price: string;
  currencyCode: string;
  imageUrl: string | null;
  variantId: string;
}

export async function searchShopifyProducts(
  admin: ShopifyAdminClient,
  query: string,
): Promise<ProductSearchResult[]> {
  const response = await admin.graphql(
    `#graphql
    query SearchProducts($query: String) {
      products(first: 20, query: $query) {
        nodes {
          id
          handle
          title
          featuredImage {
            url
          }
          variants(first: 1) {
            nodes {
              id
              price
            }
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }`,
    { variables: { query: query ? `title:*${query}*` : undefined } },
  );

  const json = await response.json();
  const nodes = json.data?.products?.nodes ?? [];

  return nodes.map((node: any) => ({
    id: node.id,
    handle: node.handle,
    title: node.title,
    price: node.priceRangeV2?.minVariantPrice?.amount ?? node.variants?.nodes?.[0]?.price ?? "0.00",
    currencyCode: node.priceRangeV2?.minVariantPrice?.currencyCode ?? "USD",
    imageUrl: node.featuredImage?.url ?? null,
    variantId: node.variants?.nodes?.[0]?.id ?? "",
  }));
}

export function getProductTagsForPost(shop: string, postKey: string) {
  return prisma.productTag.findMany({
    where: { shop, postKey },
    orderBy: { position: "asc" },
  });
}

export async function getProductTagsForPosts(shop: string, postKeys: string[]) {
  if (postKeys.length === 0) return new Map<string, Awaited<ReturnType<typeof getProductTagsForPost>>>();

  const tags = await prisma.productTag.findMany({
    where: { shop, postKey: { in: postKeys } },
    orderBy: { position: "asc" },
  });

  const grouped = new Map<string, typeof tags>();
  for (const tag of tags) {
    const list = grouped.get(tag.postKey) ?? [];
    list.push(tag);
    grouped.set(tag.postKey, list);
  }
  return grouped;
}

export async function addProductTag(
  shop: string,
  postKey: string,
  product: ProductSearchResult,
) {
  const existing = await prisma.productTag.findFirst({
    where: { shop, postKey, productId: product.id },
  });
  if (existing) return existing;

  const count = await prisma.productTag.count({ where: { shop, postKey } });

  return prisma.productTag.create({
    data: {
      shop,
      postKey,
      productId: product.id,
      productHandle: product.handle,
      title: product.title,
      price: product.price,
      currencyCode: product.currencyCode,
      imageUrl: product.imageUrl,
      variantId: product.variantId,
      position: count,
    },
  });
}

export function removeProductTag(shop: string, id: string) {
  return prisma.productTag.deleteMany({ where: { shop, id } });
}
