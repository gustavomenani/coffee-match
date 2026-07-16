import type { LabelHTMLAttributes, ReactNode } from "react";

type Props = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function Label({ children, className = "", ...props }: Props) {
  return (
    <label
      className={`flex flex-col gap-1 text-sm ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
