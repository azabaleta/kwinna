"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "hsl(223, 44%, 11%)",
          border: "1px solid hsl(220, 20%, 20%)",
          color: "hsl(220, 14%, 96%)",
        },
      }}
    />
  );
}
