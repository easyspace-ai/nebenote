import { cn } from "@/lib/utils";
import { Panel as PanelPrimitive } from "@xyflow/react";
import type { ComponentProps } from "react";

type PanelProps = ComponentProps<typeof PanelPrimitive>;

export const Panel = ({ className, ...props }: PanelProps) => (
  <PanelPrimitive
    className={cn(
      "bg-card m-3 overflow-hidden rounded-lg border border-border/60 p-0.5 shadow-sm",
      className,
    )}
    {...props}
  />
);
