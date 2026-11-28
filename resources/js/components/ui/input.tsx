import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-xl border bg-background/85 px-3 py-1 text-base shadow-2xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:cursor-pointer file:items-center file:rounded-lg file:border-0 file:bg-amber-500/15 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-800 hover:file:bg-amber-500/25 dark:file:text-amber-300 file:mr-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        type === "file" && "h-9 cursor-pointer py-[3px] text-xs text-muted-foreground",
        "focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
