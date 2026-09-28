import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (
    url.searchParams.get("shop") ||
    url.searchParams.get("host") ||
    url.searchParams.get("embedded")
  ) {
    throw redirect(`/app/custom-media${url.search}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>InstaGallery</h1>
        <p className={styles.text}>
          Display your Instagram feed as a shoppable gallery on your Shopify
          store.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Auto-syncing feed</strong>. Your latest Instagram posts
            and reels stay up to date automatically.
          </li>
          <li>
            <strong>Custom layouts</strong>. Choose grid, slider, list, or a
            floating widget to match your theme.
          </li>
          <li>
            <strong>Shoppable posts</strong>. Let shoppers browse your
            Instagram content without leaving your store.
          </li>
        </ul>
      </div>
    </div>
  );
}
