import type { ReactNode } from "react";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f10",
        backgroundImage:
          "radial-gradient(circle at 20% 0%, rgba(212,175,55,0.10), transparent 45%), radial-gradient(circle at 100% 100%, rgba(212,175,55,0.06), transparent 40%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "56px 20px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #8a6a2f, #f3e2b3 45%, #d4af37 75%, #8a6a2f)",
              boxShadow: "0 0 0 1px rgba(212,175,55,0.4)",
            }}
          />
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 600,
              fontSize: 19,
              letterSpacing: "0.04em",
              color: "#f3e2b3",
            }}
          >
            InstaGallery
          </span>
        </div>

        <div
          style={{
            background: "#17181a",
            borderRadius: 18,
            padding: "44px 48px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            border: "1px solid transparent",
            backgroundImage:
              "linear-gradient(#17181a, #17181a), linear-gradient(135deg, #b88a44, #f3e2b3 35%, #d4af37 60%, #8a6a2f)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 500,
              fontSize: 32,
              color: "#f5f5f4",
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </h1>
          <p style={{ color: "#8a8a8f", marginTop: 8, fontSize: 14 }}>
            Last updated: {updated}
          </p>

          <div
            style={{
              height: 1,
              background: "linear-gradient(90deg, transparent, #d4af37, transparent)",
              opacity: 0.6,
              margin: "28px 0 32px 0",
            }}
          />

          <div className="legal-content">{children}</div>

          <style>{`
            .legal-content {
              color: #c9c9ce;
              font-size: 16px;
              line-height: 1.8;
            }
            .legal-content h2 {
              font-family: Georgia, 'Times New Roman', serif;
              color: #f3e2b3;
              font-weight: 500;
              font-size: 20px;
              margin: 34px 0 12px 0;
            }
            .legal-content p {
              margin: 0 0 16px 0;
            }
            .legal-content ul {
              margin: 0 0 16px 0;
              padding-left: 20px;
            }
            .legal-content li {
              margin-bottom: 10px;
            }
            .legal-content strong {
              color: #eaeaec;
            }
            .legal-content a {
              color: #d4af37;
              font-weight: 600;
              text-decoration: none;
            }
            .legal-content a:hover {
              text-decoration: underline;
            }
            .legal-content code {
              background: rgba(212,175,55,0.12);
              color: #f3e2b3;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 14px;
            }
          `}</style>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#6b6b70",
            fontSize: 13,
            marginTop: 28,
            letterSpacing: "0.02em",
          }}
        >
          InstaGallery - a Shopify app for shoppable Instagram feeds
        </p>
      </div>
    </div>
  );
}
