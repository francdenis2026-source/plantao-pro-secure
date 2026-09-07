import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Valida a contagem de visitantes em tempo real (Supabase Realtime Presence).
 *
 * Regras verificadas:
 *   1. Uma aba solitária deve mostrar 1 visitante.
 *   2. Duas abas do MESMO contexto (mesmo localStorage → mesmo visitor_id)
 *      continuam contando como 1 visitante.
 *   3. Uma aba em contexto ISOLADO (localStorage diferente) incrementa para 2.
 *   4. Ao fechar a aba do 2º contexto, o `untrack` em `pagehide` faz a
 *      contagem retornar a 1 rapidamente.
 */

const CELL_LABEL = /Visitantes/i;

async function readVisitorCount(page: Page): Promise<number> {
  // A célula tem o rótulo "Visitantes" e o valor "N agora" logo abaixo.
  const cell = page.locator('div', { hasText: CELL_LABEL }).filter({
    has: page.locator('text=/^\\d+\\s+agora$/'),
  }).first();
  const valueText = await cell.locator('text=/^\\d+\\s+agora$/').innerText();
  const match = valueText.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

async function waitForCount(page: Page, expected: number, timeoutMs = 15_000) {
  await expect.poll(() => readVisitorCount(page), {
    message: `esperando contagem de visitantes = ${expected}`,
    timeout: timeoutMs,
    intervals: [250, 500, 750, 1000],
  }).toBe(expected);
}

async function openHome(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // aguarda a barra estar visível
  await page.locator('div', { hasText: CELL_LABEL }).first().waitFor({ timeout: 10_000 });
  return page;
}

test.describe('Visitantes online — Presence em tempo real', () => {
  test('múltiplas abas do mesmo navegador contam como 1 visitante', async ({ browser }) => {
    const ctx = await browser.newContext();
    const tab1 = await openHome(ctx);
    await waitForCount(tab1, 1);

    // Abre uma segunda aba no MESMO contexto → mesmo localStorage → mesmo visitor_id.
    const tab2 = await openHome(ctx);
    // Ambas as abas devem continuar mostrando 1.
    await waitForCount(tab1, 1);
    await waitForCount(tab2, 1);

    await tab2.close();
    await tab1.close();
    await ctx.close();
  });

  test('contexto isolado incrementa contagem e diminui ao fechar', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    const pageA = await openHome(ctxA);
    await waitForCount(pageA, 1);

    const pageB = await openHome(ctxB);
    // Cada contexto tem localStorage próprio → visitor_id distinto → 2 visitantes.
    await waitForCount(pageA, 2);
    await waitForCount(pageB, 2);

    // Fecha o contexto B: pagehide dispara untrack() e a contagem volta a 1.
    await pageB.close();
    await ctxB.close();
    await waitForCount(pageA, 1, 20_000);

    await pageA.close();
    await ctxA.close();
  });
});
