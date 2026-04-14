import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/public/navbar";

/** Layout del área pública (shop, cart, checkout). Sin auth requerida. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <div className="pt-14">{children}</div>
    </>
  );
}
