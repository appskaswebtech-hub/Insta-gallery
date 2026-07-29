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
        background: "linear-gradient(135deg, #fdf4ff 0%, #eef2ff 50%, #fff7ed 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "48px 20px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 18, color: "#1f2937" }}>
            InstaGallery
          </span>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: "40px 44px",
            boxShadow: "0 10px 40px rgba(31, 41, 55, 0.08)",
            border: "1px solid rgba(31, 41, 55, 0.06)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              color: "#111827",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 14 }}>
            Last updated: {updated}
          </p>

          <div
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)",
              opacity: 0.25,
              margin: "24px 0 28px 0",
            }}
          />

          <div className="legal-content">{children}</div>

          <style>{`
            .legal-content {
              color: #374151;
              font-size: 16px;
              line-height: 1.75;
            }
            .legal-content h2 {
              color: #111827;
              font-size: 19px;
              margin: 32px 0 10px 0;
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
            .legal-content a {
              color: #833ab4;
              font-weight: 600;
              text-decoration: none;
            }
            .legal-content a:hover {
              text-decoration: underline;
            }
          `}</style>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 13,
            marginTop: 24,
          }}
        >
          InstaGallery — a Shopify app for shoppable Instagram feeds
        </p>
      </div>
    </div>
  );
}
