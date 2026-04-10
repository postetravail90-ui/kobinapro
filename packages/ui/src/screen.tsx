import React from "react";

export function Screen({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {subtitle ? <p style={{ margin: "6px 0 0 0", color: "#52525b" }}>{subtitle}</p> : null}
      </header>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </main>
  );
}
