import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-mesh p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pattern-kente absolute inset-0" />
        <div className="relative"><Logo light /></div>
        <div className="relative max-w-md">
          <p className="font-display text-4xl font-extrabold leading-tight">Vendez à toute l&apos;Afrique de l&apos;Ouest, depuis votre téléphone.</p>
          <p className="mt-4 text-night-100">Boutique gratuite, lien à partager, commandes WhatsApp, zéro commission sur vos ventes.</p>
        </div>
        <p className="relative text-sm text-night-200">© ECOM MARKET</p>
      </div>
      <div className="flex flex-col p-6 sm:p-10">
        <div className="lg:hidden"><Logo /></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </div>
    </div>
  );
}
