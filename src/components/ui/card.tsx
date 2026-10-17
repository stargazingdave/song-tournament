import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn("management-card", className)}
      {...props}
    />
  );
}
export function CardHeader(props: ComponentProps<"div">) {
  return <div data-slot="card-header" {...props} />;
}
export function CardTitle({
  as: Tag = "h2",
  ...props
}: ComponentProps<"h2"> & { as?: "h1" | "h2" | "h3" }) {
  return <Tag data-slot="card-title" {...props} />;
}
export function CardDescription(props: ComponentProps<"p">) {
  return <p data-slot="card-description" {...props} />;
}
export function CardContent(props: ComponentProps<"div">) {
  return <div data-slot="card-content" {...props} />;
}
export function CardFooter(props: ComponentProps<"div">) {
  return <div data-slot="card-footer" {...props} />;
}
