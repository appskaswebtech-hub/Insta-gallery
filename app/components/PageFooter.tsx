export default function PageFooter() {
  return (
    <div style={{ textAlign: "center", padding: "24px 0 8px 0" }}>
      <s-text color="subdued">
        © {new Date().getFullYear()} InstaGallery. All rights reserved.
      </s-text>
    </div>
  );
}
