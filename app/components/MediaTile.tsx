import { useState, type ReactNode } from "react";

export default function MediaTile({
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  children,
}: {
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: hovered ? "1px solid #a5b4fc" : "1px solid #e3e4e6",
        borderRadius: 12,
        padding: 10,
        background: "#fff",
        cursor: draggable ? "grab" : undefined,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: hovered ? "0 4px 14px rgba(79, 70, 229, 0.12)" : "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {children}
    </div>
  );
}
