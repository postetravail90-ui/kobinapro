import React from "react";

interface OfflineBadgeProps {
  offline: boolean;
  pendingCount: number;
}

export function OfflineBadge({ offline, pendingCount }: OfflineBadgeProps): JSX.Element {
  if (!offline && pendingCount <= 0) return <></>;
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        background: offline ? "#dc2626" : "#f59e0b",
        color: "white",
        fontSize: 12,
        fontWeight: 600
      }}
    >
      {offline ? "Hors ligne" : "Synchronisation"} - {pendingCount}
    </div>
  );
}
