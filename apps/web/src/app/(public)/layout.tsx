import type { ReactNode } from "react";

/** Layout del área pública (shop, cart, checkout). Sin auth requerida. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
