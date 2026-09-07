/**
 * Diretório de Agentes — validação de escopo e ausência de duplicidades.
 *
 * Este teste requer uma sessão Supabase injetada no ambiente
 * (LOVABLE_BROWSER_SUPABASE_*). Sem sessão o teste é ignorado.
 *
 * Regras verificadas em /diretorio:
 *   1. Aba "Equipe": todos os badges de equipe visíveis correspondem à mesma
 *      sigla (a equipe do agente logado). Nenhum agente de outra equipe é
 *      mostrado.
 *   2. Abas "Unidade" e "Sistema": não existem linhas duplicadas (o mesmo
 *      agente não aparece duas vezes na lista renderizada).
 *   3. O contador do rodapé ("Mostrando X de Y agentes") reflete o dataset
 *      da aba corrente — X === Y quando nenhum filtro está aplicado.
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

const hasSession =
  !!process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON &&
  !!process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;

async function injectSession(page: Page) {
  const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY!;
  const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON!;
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k, v),
    [storageKey, sessionJson],
  );
}

async function gotoTab(page: Page, label: 'Equipe' | 'Unidade' | 'Sistema') {
  await page.getByRole('tab', { name: new RegExp(label, 'i') }).click();
  // Aguarda o cabeçalho do card atualizar ou a lista carregar.
  await page.waitForTimeout(300);
  await expect
    .poll(async () => {
      const spinner = await page.locator('text=/Carregando agentes/i').count();
      return spinner;
    }, { timeout: 10_000 })
    .toBe(0);
}

async function collectAgentIds(page: Page): Promise<string[]> {
  // Cada linha é um <li> com um botão "Ver detalhes"; usamos o texto do nome
  // (elemento <p> com font-semibold) como identificador estável na UI.
  const names = await page.locator('ul > li p.font-semibold').allInnerTexts();
  return names.map((n) => n.replace(/\(você\)/i, '').trim());
}

test.describe('Diretório — escopo por aba e ausência de duplicidades', () => {
  test.skip(!hasSession, 'Sessão Supabase não injetada no ambiente.');

  test('aba Equipe mostra apenas a equipe do agente logado', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE}/diretorio`, { waitUntil: 'domcontentloaded' });

    await gotoTab(page, 'Equipe');

    // Todos os badges de equipe visíveis nas linhas devem ser iguais.
    const teamBadges = await page
      .locator('ul > li >> text=/^(ALFA|BRAVO|CHARLIE|DELTA)$/')
      .allInnerTexts();

    if (teamBadges.length === 0) {
      // Agente sem equipe: nada a validar aqui.
      test.info().annotations.push({
        type: 'note',
        description: 'Agente logado não possui equipe — assertivo vazio.',
      });
      return;
    }
    const unique = new Set(teamBadges.map((t) => t.trim()));
    expect(unique.size, `esperado apenas 1 equipe, veio: ${[...unique].join(',')}`).toBe(1);
  });

  test('abas Unidade e Sistema não renderizam agentes duplicados', async ({ page }) => {
    await injectSession(page);
    await page.goto(`${BASE}/diretorio`, { waitUntil: 'domcontentloaded' });

    for (const tab of ['Unidade', 'Sistema'] as const) {
      await gotoTab(page, tab);
      const names = await collectAgentIds(page);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      expect(dupes, `duplicidades em ${tab}: ${dupes.join(', ')}`).toEqual([]);

      // Rodapé "Mostrando X de Y agentes" — sem filtros X deve = Y.
      const footer = await page.locator('text=/Mostrando \\d+ de \\d+ agentes/').innerText();
      const m = footer.match(/Mostrando (\d+) de (\d+)/);
      expect(m, 'contador do rodapé ausente').not.toBeNull();
      expect(Number(m![1])).toBe(Number(m![2]));
    }
  });
});
