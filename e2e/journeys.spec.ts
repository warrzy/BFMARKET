import { expect, test, type Page } from "@playwright/test";

// Parcours réels contre la base de démonstration (npm run db:seed avec SEED_DEMO=true).
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo-vendeur-2026";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@ecommarket.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin-dev-2026";

async function login(page: Page, id: string, pw: string) {
  await page.goto("/connexion");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Téléphone ou e-mail").fill(id);
  await page.getByLabel("Mot de passe").fill(pw);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));
}

test("acheteur : recherche → fiche → panier → commande invité → suivi non payé", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("un seul marché");
  await page.getByRole("search").first().getByRole("textbox").fill("karité");
  await page.getByRole("search").first().getByRole("textbox").press("Enter");
  await expect(page).toHaveURL(/produits\?q=/);
  await page.locator('a[href^="/produit/"]').first().click();
  await expect(page.getByRole("button", { name: "Commander", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Commander via WhatsApp/ })).toHaveAttribute("href", /wa\.me\/\d+\?text=/);
  await page.getByRole("button", { name: "Commander", exact: true }).click();
  await expect(page).toHaveURL(/\/panier/);
  await page.getByPlaceholder("Nom complet").fill("Aminata Test");
  await page.getByPlaceholder("Téléphone / WhatsApp").fill("70 11 22 33");
  await page.locator('select[name="city"]').selectOption("Ouagadougou");
  await page.getByPlaceholder("Quartier / secteur").fill("Gounghin");
  await page.getByPlaceholder(/Point de repère/).fill("Près du marché");
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Confirmer la commande" }).click();
  await expect(page).toHaveURL(/commande\/suivi\/.+nouvelle=1/, { timeout: 20000 });
  await expect(page.getByText("Commande envoyée !")).toBeVisible();
  await expect(page.getByText("Non payée").first()).toBeVisible();
});

test("vendeur démo : confirme la commande et valide l'encaissement", async ({ page }) => {
  await login(page, "demo+karite-beaute-naturelle@ecommarket.local", DEMO_PASSWORD);
  await expect(page).toHaveURL(/\/vendeur/);
  await page.goto("/vendeur/commandes?status=PENDING");
  const href = await page.locator('main a[href^="/vendeur/commandes/"]').first().getAttribute("href");
  await page.goto(href!);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Confirmée" }).click();
  await expect(page.locator(".badge", { hasText: /^Confirmée$/ })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Confirmer le paiement reçu" }).click();
  await expect(page.locator(".badge", { hasText: /^Payée$/ })).toBeVisible();
  await expect(page.getByText(/· validation manuelle/)).toBeVisible();
});

test("isolation : un vendeur ne peut pas ouvrir la commande d'une autre boutique", async ({ page }) => {
  await login(page, "demo+karite-beaute-naturelle@ecommarket.local", DEMO_PASSWORD);
  await page.goto("/vendeur/commandes");
  const href = await page.locator('main a[href^="/vendeur/commandes/"]').first().getAttribute("href");
  expect(href).toBeTruthy();
  await page.context().clearCookies();
  await login(page, "demo+dakar-sneakers@ecommarket.local", DEMO_PASSWORD);
  const res = await page.goto(href!);
  expect(res?.status()).toBe(404);
});

test("nouveau vendeur : inscription → code → boutique ouverte en quelques étapes", async ({ page }) => {
  const phone = `7${Math.floor(1000000 + Math.random() * 8999999)}`;
  await page.goto("/inscription?vendeur=1");
  await page.getByLabel("Nom complet").fill("Issa Entrepreneur");
  await page.getByLabel("Téléphone (WhatsApp) ou e-mail").fill(phone);
  await page.getByLabel("Mot de passe").fill("motdepasse-solide");
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/verification/);
  const code = (await page.locator("b.font-mono").textContent())!.trim();
  await page.getByLabel("Code à 6 chiffres").fill(code);
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/ouvrir-boutique/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nom de la boutique").fill(`Issa Shop ${phone}`);
  await page.getByLabel("Ville").selectOption({ label: "Bobo-Dioulasso" });
  await page.getByLabel("Secteur d'activité").fill("Électronique");
  await page.getByLabel("Numéro WhatsApp de la boutique").fill(phone);
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Logo et couverture" })).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: /premier produit/ })).toBeVisible();
  await page.getByRole("button", { name: "Passer cette étape" }).click();
  await page.getByRole("button", { name: "Ouvrir ma boutique" }).click();
  await expect(page).toHaveURL(/\/vendeur\?bienvenue=1/);
  await expect(page.getByText("Votre boutique est en ligne !")).toBeVisible();
});

test("admin : accès au back-office et vérification d'une boutique, journalisée", async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin/boutiques?v=NONE");
  await page.getByRole("button", { name: "Vérifier" }).first().click();
  await page.goto("/admin/journal?action=shop.verification");
  await expect(page.getByText("shop.verification.verified").first()).toBeVisible();
});

test("accès protégé : un acheteur anonyme est redirigé hors des espaces privés", async ({ page }) => {
  await page.goto("/vendeur");
  await expect(page).toHaveURL(/connexion/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/connexion/);
});
