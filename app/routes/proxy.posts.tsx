import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
// INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
// import { getInstagramPosts } from "../instagram.server";
import { getCustomMedia } from "../custom-media.server";
import { getFeed } from "../feed.server";
import { resolveMediaUrl } from "../uploads.server";

const DEFAULT_FEED = {
  postsToShow: "own_posts",
  layout: "grid",
  title: "",
  onPostClick: "popup",
  postSpacing: "small",
  aspectRatio: "3:4",
  postFit: "cover",
  postShape: "rectangle",
  cornerRadius: 0,
  postSize: "medium",
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

  // INSTAGRAM DISABLED FOR APP REVIEW - uncomment when Instagram connect is re-enabled
  const [customMedia, feed] = await Promise.all([
    getCustomMedia(session.shop),
    getFeed(session.shop),
  ]);

  const posts = [
    ...customMedia.map((item) => {
      const url = resolveMediaUrl(item.url);
      return {
        id: `custom-${item.id}`,
        mediaType: item.mediaType.toUpperCase(),
        mediaUrl: url,
        thumbnailUrl: item.mediaType === "video" ? null : url,
        permalink: url,
        caption: item.caption,
      };
    }),
    // ...instagramPosts.map((post) => ({
    //   id: post.id,
    //   mediaType: post.mediaType,
    //   mediaUrl: post.mediaUrl,
    //   thumbnailUrl: post.thumbnailUrl,
    //   permalink: post.permalink,
    //   caption: post.caption,
    //   carouselChildren: post.carouselChildren
    //     ? JSON.parse(post.carouselChildren)
    //     : null,
    // })),
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
          postFit: feed.postFit,
          postShape: feed.postShape,
          cornerRadius: feed.cornerRadius,
          postSize: feed.postSize,
          rowsDesktop: feed.rowsDesktop,
          colsDesktop: feed.colsDesktop,
          rowsMobile: feed.rowsMobile,
          colsMobile: feed.colsMobile,
        }
      : DEFAULT_FEED,
  });
};
