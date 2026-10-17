import type { ComponentProps } from "react";
export function Alert({
  variant = "default",
  ...props
}: ComponentProps<"div"> & {
  variant?: "default" | "destructive" | "warning";
}) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role={variant === "destructive" ? "alert" : "status"}
      {...props}
    />
  );
}
export function AlertTitle(props: ComponentProps<"h3">) {
  return <h3 data-slot="alert-title" {...props} />;
}
export function AlertDescription(props: ComponentProps<"p">) {
  return <p data-slot="alert-description" {...props} />;
}
