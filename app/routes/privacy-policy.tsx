import LegalPage from "../components/LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" updated="July 29, 2026">
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
      <p>
        We do not access, collect, or store any personal information about
        your store&apos;s customers. This app only accesses the merchant&apos;s
        own store and Instagram account data.
      </p>

      <h2>How we use this information</h2>
      <p>
        We use this data solely to render your Instagram feed on your
        storefront, let you configure how it looks, and let shoppers view and
        purchase tagged products. We do not sell or share your data with
        third parties for advertising purposes.
      </p>

      <h2>Data storage and hosting</h2>
      <p>
        Data is stored in our application&apos;s database, hosted on our
        server infrastructure (provided by GoDaddy.com, LLC), accessible only
        to the app for the purpose of operating your feed. Instagram access
        tokens are stored securely and used only to fetch your own content.
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        If you uninstall the app, we automatically delete your store&apos;s
        data, including any connected Instagram account information and
        synced posts, in accordance with Shopify&apos;s mandatory compliance
        webhooks (<code>shop/redact</code>). If you disconnect your Instagram
        account without uninstalling the app, we delete the associated
        access token immediately and stop syncing new content. You may also
        request full deletion of your data at any time — see our{" "}
        <a href="/data-deletion">Data Deletion Instructions</a>.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access to, or deletion of, any data we hold about
        your store or connected Instagram account at any time by contacting
        us using the details below.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href="mailto:instagallery01@gmail.com">instagallery01@gmail.com</a>.
      </p>
    </LegalPage>
  );
}
