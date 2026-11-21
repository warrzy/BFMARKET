import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppFab } from "./WhatsAppFab";
import { db } from "@/server/db";

export async function SiteShell({ children, q, whatsapp, waMessage }: { children: React.ReactNode; q?: string; whatsapp?: string | null; waMessage?: string }) {
  const support = whatsapp === undefined ? ((await db.setting.findUnique({ where: { key: "platform.supportWhatsapp" } }))?.value as string | undefined) : whatsapp;
  return (
    <>
      <Header q={q} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <WhatsAppFab phone={support ? (support.startsWith("+") ? support : `+${support}`) : null} message={waMessage} />
    </>
  );
}
