import prisma from "./db.server";

export function getFeed(shop: string) {
  return prisma.feed.findUnique({ where: { shop } });
}

export interface FeedInput {
  postsToShow: string;
  layout: string;
  title: string;
  onPostClick: string;
  postSpacing: string;
  aspectRatio: string;
  roundedCorners: boolean;
  rowsDesktop: number;
  colsDesktop: number;
  rowsMobile: number;
  colsMobile: number;
}

export function saveFeed(shop: string, input: FeedInput) {
  return prisma.feed.upsert({
    where: { shop },
    create: { shop, ...input },
    update: { ...input },
  });
}

export interface FeedDesignSettingsInput {
  showLoadingAnimation: boolean;
  linkToOriginalPost: boolean;
  showSliderPreviews: boolean;
}

export function saveFeedDesignSettings(
  shop: string,
  input: FeedDesignSettingsInput,
) {
  return prisma.feed.upsert({
    where: { shop },
    create: { shop, ...input },
    update: { ...input },
  });
}
