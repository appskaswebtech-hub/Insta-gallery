import type { ReactNode } from "react";

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
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        border: "1px solid #e3e4e6",
        borderRadius: 12,
        padding: 10,
        background: "#fff",
        cursor: draggable ? "grab" : undefined,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}
