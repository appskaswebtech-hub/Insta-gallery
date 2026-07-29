import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getInstagramPosts } from "../instagram.server";
import { getCustomMedia } from "../custom-media.server";
import { getFeed } from "../feed.server";

const DEFAULT_FEED = {
  postsToShow: "own_posts",
  layout: "grid",
  title: "",
  onPostClick: "popup",
  postSpacing: "small",
  aspectRatio: "3:4",
  roundedCorners: false,
  rowsDesktop: 2,
  colsDesktop: 4,
  rowsMobile: 2,
  colsMobile: 2,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ posts: [], feed: DEFAULT_FEED });
  }

  const [instagramPosts, customMedia, feed] = await Promise.all([
    getInstagramPosts(session.shop),
    getCustomMedia(session.shop),
    getFeed(session.shop),
  ]);

  const posts = [
    ...customMedia.map((item) => ({
      id: `custom-${item.id}`,
      mediaType: item.mediaType.toUpperCase(),
      mediaUrl: item.url,
      thumbnailUrl: item.mediaType === "video" ? null : item.url,
      permalink: item.url,
      caption: item.caption,
    })),
    ...instagramPosts.map((post) => ({
      id: post.id,
      mediaType: post.mediaType,
      mediaUrl: post.mediaUrl,
      thumbnailUrl: post.thumbnailUrl,
      permalink: post.permalink,
      caption: post.caption,
    })),
  ];

  return Response.json({
    posts,
    feed: feed
      ? {
          postsToShow: feed.postsToShow,
          layout: feed.layout,
          title: feed.title,
          onPostClick: feed.onPostClick,
          postSpacing: feed.postSpacing,
          aspectRatio: feed.aspectRatio,
          roundedCorners: feed.roundedCorners,
          rowsDesktop: feed.rowsDesktop,
          colsDesktop: feed.colsDesktop,
          rowsMobile: feed.rowsMobile,
          colsMobile: feed.colsMobile,
        }
      : DEFAULT_FEED,
  });
};
