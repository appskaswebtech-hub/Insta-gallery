import type { ReactNode } from "react";

const SIZES = {
  small: { box: 40, icon: 18, radius: 10 },
  medium: { box: 48, icon: 22, radius: 12 },
  large: { box: 56, icon: 26, radius: 14 },
} as const;

export default function IconBadge({
  path,
  children,
  size = "medium",
}: {
  path?: string | string[];
  children?: ReactNode;
  size?: keyof typeof SIZES;
}) {
  const { box, icon, radius } = SIZES[size];
  const paths = path ? (Array.isArray(path) ? path : [path]) : [];

  return (
    <div
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        background: "linear-gradient(135deg, #6b6f76, #4a4d52 55%, #2e3033)",
        boxShadow: "0 3px 10px rgba(0, 0, 0, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={icon}
        height={icon}
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children ?? paths.map((d) => <path key={d} d={d}></path>)}
      </svg>
    </div>
  );
}
