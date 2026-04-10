import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input(props: InputProps): JSX.Element {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        border: "1px solid #d4d4d8",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 14
      }}
    />
  );
}
