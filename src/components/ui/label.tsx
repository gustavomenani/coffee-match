import type { LabelHTMLAttributes, ReactNode } from "react";

type Props = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function Label({ children, className = "", ...props }: Props) {
  return (
    <label className={`label ${className}`} {...props}>
      {children}
    </label>
  );
}
