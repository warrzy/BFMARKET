import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/server/auth/session";
import { formatPhoneInternational } from "@/lib/phone";

export const metadata = { title: "Vérification" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string; dev?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  if (user.verifiedAt) redirect(next);
  return (
    <>
      <h1 className="mb-1 text-3xl font-extrabold">Vérifiez votre compte</h1>
      <p className="mb-8 muted">Saisissez le code à 6 chiffres envoyé à <b>{user.phone ? formatPhoneInternational(user.phone) : user.email}</b>.</p>
      <VerifyForm next={next} devCode={process.env.NODE_ENV !== "production" || process.env.OTP_SHOW_ON_SCREEN === "true" ? sp.dev : undefined} />
    </>
  );
}
