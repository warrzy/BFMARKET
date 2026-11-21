import bcrypt from "bcryptjs";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

let dummy: Promise<string> | null = null;
/** Comparaison factice pour un compte inexistant : temps de réponse homogène (anti-énumération). */
export async function dummyVerify(pw: string) {
  dummy ??= bcrypt.hash("dummy-password-for-timing", 12);
  await bcrypt.compare(pw, await dummy);
  return false;
}
