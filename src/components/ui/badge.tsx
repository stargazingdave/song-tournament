import type { ComponentProps } from "react";
export function Badge({
  variant = "secondary",
  ...props
}: ComponentProps<"span"> & { variant?: "secondary" | "outline" }) {
  return <span data-slot="badge" data-variant={variant} {...props} />;
}
