import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:   "border-transparent bg-brand/10 text-brand",
        live:      "border-brand/50 bg-brand/12 text-brand",
        processing:"border-warn/50 bg-warn/10 text-warn-dark",
        completed: "border-ok/30 bg-ok/10 text-ok",
        outline:   "bg-surface border-line text-tx-dim font-semibold",
        admin:     "border-transparent bg-brand/10 text-brand",
        user:      "border-transparent bg-surface text-tx-dim",
        active:    "border-transparent bg-ok/12 text-ok",
        inactive:  "border-transparent bg-surface text-tx-muted",
      },
    },
    defaultVariants: { variant:"default" },
  }
);
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
