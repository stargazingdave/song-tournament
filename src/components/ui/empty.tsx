import type { ComponentProps } from "react";
export function Empty(props: ComponentProps<"div">) {
  return <div data-slot="empty" {...props} />;
}
export function EmptyHeader(props: ComponentProps<"div">) {
  return <div data-slot="empty-header" {...props} />;
}
export function EmptyTitle(props: ComponentProps<"h2">) {
  return <h2 data-slot="empty-title" {...props} />;
}
export function EmptyDescription(props: ComponentProps<"p">) {
  return <p data-slot="empty-description" {...props} />;
}
export function EmptyContent(props: ComponentProps<"div">) {
  return <div data-slot="empty-content" {...props} />;
}
