"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, placeholder, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-1",
        "text-sm text-gray-100 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-gray-950",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {children}
    </select>
  ),
);
NativeSelect.displayName = "NativeSelect";
