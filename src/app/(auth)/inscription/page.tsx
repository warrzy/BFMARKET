import { SignupForm } from "@/components/auth/forms";
import { getActiveCountries, getLocation } from "@/server/location";

export const metadata = { title: "Inscription" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ vendeur?: string }> }) {
  const sp = await searchParams;
  const [countries, loc] = await Promise.all([getActiveCountries(), getLocation()]);
  return (
    <>
      <h1 className="mb-1 text-3xl font-extrabold">Créer un compte</h1>
      <p className="mb-8 muted">Gratuit, en moins d&apos;une minute.</p>
      <SignupForm intent={sp.vendeur ? "seller" : "buyer"} defaultCountry={loc.country ?? "BF"} countries={countries.map((c) => ({ code: c.code, name: c.nameFr, flag: c.flag, dial: c.dialCode }))} />
    </>
  );
}
