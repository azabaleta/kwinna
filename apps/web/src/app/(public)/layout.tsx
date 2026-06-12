import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/public/navbar";
import { PublicFooter } from "@/components/public/footer";
import { CartAuthSync } from "@/components/shop/cart-auth-sync";
import { WhatsAppBubble } from "@/components/public/whatsapp-bubble";
import { PromoStrip } from "@/components/public/promo-strip";

/** Layout del área pública (shop, cart, checkout). Sin auth requerida. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CartAuthSync />
      <PublicNavbar />
      <div className="pt-14 min-h-[calc(100vh-200px)]">
        <PromoStrip />
        {children}
      </div>
      <PublicFooter />
      <WhatsAppBubble />
    </>
  );
}
