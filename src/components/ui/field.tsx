import type { ComponentProps } from "react";

export function FieldGroup(props: ComponentProps<"div">) {
  return <div data-slot="field-group" {...props} />;
}
export function Field(props: ComponentProps<"div">) {
  return <div data-slot="field" {...props} />;
}
export function FieldLabel(props: ComponentProps<"label">) {
  return <label data-slot="field-label" {...props} />;
}
export function FieldDescription(props: ComponentProps<"p">) {
  return <p data-slot="field-description" {...props} />;
}
export function FieldSet(props: ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" {...props} />;
}
export function FieldLegend(props: ComponentProps<"legend">) {
  return <legend data-slot="field-legend" {...props} />;
}
