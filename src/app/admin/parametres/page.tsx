import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { PageTitle } from "@/components/dashboard/DashShell";
import { SettingsForm } from "@/components/admin/Forms";

export default async function AdminSettings() {
  await requireAdmin(["SUPER_ADMIN"]);
  const settings = Object.fromEntries((await db.setting.findMany()).map((s) => [s.key, s.value]));
  return (
    <>
      <PageTitle title="Paramètres globaux" />
      <div className="card p-5"><SettingsForm supportWhatsapp={String(settings["platform.supportWhatsapp"] ?? "")} moderation={String(settings["catalog.moderation"] ?? "post")} /></div>
      <div className="card mt-6 p-5 text-sm">
        <h2 className="mb-2 font-bold">Modèle économique</h2>
        <p className="muted">Commission sur les ventes : <b>0 %</b> (monétisation par abonnements, mise en avant et services premium). Les fonds des ventes ne transitent pas par la plateforme.</p>
      </div>
    </>
  );
}
