import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Analytics() {
  return (
    <s-page heading="Analytics">
      <s-section heading="Feed performance">
        <s-paragraph>
          Track impressions and click-throughs for your Instagram feed. Coming
          soon.
        </s-paragraph>
        <s-button disabled>Upgrade</s-button>
      </s-section>
    </s-page>
  );
}
