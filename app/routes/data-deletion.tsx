import LegalPage from "../components/LegalPage";

export default function DataDeletion() {
  return (
    <LegalPage title="Data Deletion Instructions" updated="July 29, 2026">
      <p>
        If you&apos;d like all data associated with your store and connected
        Instagram account removed from InstaGallery, you have two options:
      </p>

      <h2>Option 1: Uninstall the app</h2>
      <p>
        Uninstalling InstaGallery from your Shopify admin automatically
        removes your Instagram access token and stops any further data
        syncing.
      </p>

      <h2>Option 2: Request full deletion</h2>
      <p>
        Email{" "}
        <a href="mailto:instagallery01@gmail.com">instagallery01@gmail.com</a>{" "}
        from the email address associated with your store, with the subject
        &quot;Data Deletion Request&quot; and your shop domain. We will delete
        all stored data (Instagram account connection, synced posts, custom
        media, and feed settings) within 30 days and confirm by email once
        complete.
      </p>
    </LegalPage>
  );
}
