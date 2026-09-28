import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import PageFooter from "../components/PageFooter";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Analytics() {
  return (
    <s-page heading="Analytics">
      <s-section heading="Feed performance">
        <s-stack direction="block" gap="base">
          <s-banner heading="Coming soon" tone="info">
            We're building analytics for your Instagram feed. Here's what
            you'll be able to track:
          </s-banner>

          <s-stack direction="block" gap="small">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-icon type="chart-vertical"></s-icon>
              <s-text>Feed impressions - how many shoppers saw your feed</s-text>
            </s-stack>
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-icon type="cursor"></s-icon>
              <s-text>Post clicks - which posts get the most engagement</s-text>
            </s-stack>
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-icon type="cart"></s-icon>
              <s-text>Product conversions from tagged posts</s-text>
            </s-stack>
          </s-stack>

          <s-button disabled icon="lock">
            Notify me when available
          </s-button>
        </s-stack>
      </s-section>

      <PageFooter />
    </s-page>
  );
}
