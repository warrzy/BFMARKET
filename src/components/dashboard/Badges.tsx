import type { PaymentStatus, SubOrderStatus } from "@prisma/client";
import fr from "@/i18n/fr";

const S: Record<SubOrderStatus, string> = {
  PENDING: "bg-gold-400/25 text-amber-800 dark:text-gold-400", CONFIRMED: "bg-night-100 text-night-700 dark:bg-night-800 dark:text-night-100",
  PREPARING: "bg-night-100 text-night-700 dark:bg-night-800 dark:text-night-100", SHIPPED: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  DELIVERED: "bg-wa-500/15 text-wa-600", CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300", RETURNED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};
const P: Record<PaymentStatus, string> = {
  UNPAID: "bg-[rgb(var(--surface-2))] muted", DECLARED: "bg-gold-400/25 text-amber-800 dark:text-gold-400", PENDING: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  PAID: "bg-wa-500 text-white", FAILED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300", REFUNDED: "bg-[rgb(var(--surface-2))] muted",
};

export const StatusBadge = ({ s }: { s: SubOrderStatus }) => <span className={`badge ${S[s]}`}>{fr.status[s]}</span>;
export const PaymentBadge = ({ s }: { s: PaymentStatus }) => <span className={`badge ${P[s]}`}>{fr.payment[s]}</span>;
