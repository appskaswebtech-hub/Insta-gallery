export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif", lineHeight: 1.6 }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: July 29, 2026</p>

      <p>
        InstaGallery (&quot;we&quot;, &quot;our&quot;, &quot;the app&quot;) is
        a Shopify app that displays a merchant&apos;s Instagram content as a
        shoppable gallery on their online store. This policy explains what
        data we collect and how we use it.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Shopify store data:</strong> shop domain, and product data
          needed to tag products in your Instagram feed, accessed via the
          Shopify Admin API with your permission at install time.
        </li>
        <li>
          <strong>Instagram account data:</strong> when you connect your
          Instagram Business or Creator account, we access your basic profile
          information (username, account type) and your media (photos,
          videos, captions, permalinks) via the Instagram API, using an
          access token you authorize.
        </li>
        <li>
          <strong>Custom media:</strong> any images or video URLs you
          manually add to your feed through the app.
        </li>
      </ul>

      <h2>How we use this information</h2>
      <p>
        We use this data solely to render your Instagram feed on your
        storefront, let you configure how it looks, and let shoppers view and
        purchase tagged products. We do not sell or share your data with
        third parties for advertising purposes.
      </p>

      <h2>Data storage</h2>
      <p>
        Data is stored in our application&apos;s database, accessible only to the
        app for the purpose of operating your feed. Instagram access tokens
        are stored securely and used only to fetch your own content.
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        If you uninstall the app or disconnect your Instagram account, we{" "}
        delete the associated Instagram access token and stop syncing new
        content. You may request full deletion of your data at any time — see
        our{" "}
        <a href="/data-deletion">Data Deletion Instructions</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href="mailto:instagallery01@gmail.com">instagallery01@gmail.com</a>.
      </p>
    </div>
  );
}
