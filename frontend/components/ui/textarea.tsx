import * as React from "react";
import { cn } from "@/lib/utils";
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea className={cn("flex min-h-[80px] w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-tx-dark placeholder:text-tx-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand disabled:cursor-not-allowed disabled:opacity-50 resize-vertical", className)} ref={ref} {...props} />
));
Textarea.displayName = "Textarea";
export { Textarea };
