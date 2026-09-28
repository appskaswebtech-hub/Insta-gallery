import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  // eslint-disable-next-line no-undef
  return { errors, apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;
  const { apiKey } = loaderData;

  return (
    <AppProvider apiKey={apiKey}>
      <s-page>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>InstaGallery</h1>
          <p>
            Showcase your Instagram photos and videos on your storefront,
            beautifully and automatically.
          </p>
        </div>

        <Form method="post">
          <s-section heading="Log in">
            <s-text-field
              name="shop"
              label="Shop domain"
              details="example.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors.shop}
            ></s-text-field>
            <s-button type="submit">Log in</s-button>
          </s-section>
        </Form>

        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginTop: "2.5rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 200px" }}>
            <strong>Automatic feeds.</strong> Connect once and your latest
            posts stay in sync with your storefront, no manual work needed.
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <strong>Custom media.</strong> Add your own photos and videos
            from your computer or a link, alongside your feed.
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <strong>Fully customizable.</strong> Choose the layout, shape,
            size, and style that matches your store's look.
          </div>
        </div>
      </s-page>
    </AppProvider>
  );
}
