"use client";

import { useEffect, useState, type ReactNode } from "react";

interface MockProviderProps {
  children: ReactNode;
}

const USE_MOCKS =
  process.env["NEXT_PUBLIC_USE_MOCKS"] === "true" &&
  process.env.NODE_ENV === "development";

export function MockProvider({ children }: MockProviderProps) {
  const [ready, setReady] = useState(!USE_MOCKS);

  useEffect(() => {
    if (!USE_MOCKS) return;

    import("@/mocks").then(({ initMocks }) => {
      initMocks().then(() => setReady(true));
    });
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
