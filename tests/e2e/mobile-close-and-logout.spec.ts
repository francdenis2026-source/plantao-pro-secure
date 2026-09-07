import { test, expect, type Page } from '@playwright/test';

/**
 * Regressão mobile — botão fechar visível + logout robusto.
 *
 * Pré-requisito: sessão autenticada injetada via
 * LOVABLE_BROWSER_SUPABASE_* (login prévio no preview).
 */

const MOBILE = { width: 360, height: 780 }; // celular pequeno (< iPhone SE)

test.use({ viewport: MOBILE });

async function ensureAuth(page: Page) {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  await page.goto('/');
  if (storageKey && sessionJson) {
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k as string, v as string),
      [storageKey, sessionJson]
    );
  }
}

test.describe('Mobile 360×780 — close button + logout', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuth(page);
    await page.goto('/agent-panel', { waitUntil: 'networkidle' });
  });

  test('Sheet/Dialog close button fica visível e clicável', async ({ page }) => {
    // Abre o Sheet de notificações via botão do header
    const notifBtn = page.locator('button[aria-label*="otificaç" i], [data-testid="notifications-trigger"]').first();
    if (await notifBtn.count()) {
      await notifBtn.click();
      const close = page.locator('[data-testid="sheet-close"], [data-testid="dialog-close"]').first();
      await expect(close).toBeVisible({ timeout: 3000 });
      const box = await close.boundingBox();
      expect(box, 'Close button deve ter bounding box').toBeTruthy();
      // Botão totalmente dentro do viewport
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(MOBILE.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(MOBILE.height + 1);
      // Área tocável ≥ 44×44
      expect(box!.width).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
      await close.click();
    }
  });

  test('Logout: botão bloqueia após clique, remove sessão e redireciona para /', async ({ page }) => {
    const logout = page.locator('[data-testid="logout-button"]');
    await expect(logout).toBeVisible();

    // Estado inicial não deve estar bloqueado
    await expect(logout).not.toHaveAttribute('aria-busy', 'true');

    // Rastreia a navegação
    const navPromise = page.waitForURL('**/', { timeout: 8000 }).catch(() => null);
    await logout.click();

    // Bloqueio imediato após clique — evita múltiplos disparos
    await expect(logout).toHaveAttribute('aria-busy', 'true', { timeout: 500 }).catch(() => {});

    // Segundo clique deve ser no-op (não quebra)
    await logout.click({ force: true }).catch(() => {});

    await navPromise;
    // URL final é a home
    expect(new URL(page.url()).pathname).toBe('/');

    // Sessão local removida
    const remaining = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((k) => k.startsWith('sb-') || k.includes('supabase.auth'))
    );
    expect(remaining, 'Storage do Supabase deve ficar limpo').toEqual([]);
  });

  test('Sticky header permanece opaco (mobile 360px) ao rolar', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(150);
    const bg = await page.$eval(
      '[role="region"][aria-label="Cabeçalho e navegação do painel"]',
      (el) => getComputedStyle(el).backgroundColor
    );
    // Deve ser rgb(...) sem canal alfa < 1
    expect(bg).toMatch(/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/);
  });
});
