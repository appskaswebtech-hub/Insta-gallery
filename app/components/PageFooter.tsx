export default function PageFooter() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "28px 0 8px 0",
        marginTop: 8,
        borderTop: "1px solid #ededee",
      }}
    >
      <div style={{ paddingTop: 16 }}>
        <s-text color="subdued">
          © {new Date().getFullYear()} InstaGallery. All rights reserved.
        </s-text>
      </div>
    </div>
  );
}
