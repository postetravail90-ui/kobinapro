import React from "react";

export function Card({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <section
      style={{
        border: "1px solid #e4e4e7",
        borderRadius: 12,
        padding: 12,
        background: "white"
      }}
    >
      {children}
    </section>
  );
}
