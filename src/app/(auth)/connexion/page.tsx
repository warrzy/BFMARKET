import { LoginForm } from "@/components/auth/forms";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (<><h1 className="mb-1 text-3xl font-extrabold">Bon retour 👋</h1><p className="mb-8 muted">Connectez-vous à votre compte ECOM MARKET.</p><LoginForm next={next} /></>);
}
