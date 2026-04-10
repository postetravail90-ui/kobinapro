import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function Button({ loading = false, children, disabled, ...props }: ButtonProps): JSX.Element {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        border: 0,
        borderRadius: 10,
        padding: "10px 14px",
        fontWeight: 600,
        background: "#16a34a",
        color: "white",
        opacity: disabled || loading ? 0.7 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer"
      }}
    >
      {loading ? "Chargement..." : children}
    </button>
  );
}
