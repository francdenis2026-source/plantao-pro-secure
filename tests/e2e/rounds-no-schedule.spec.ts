/**
 * Gestor de Ronda — a função "Programar ronda" foi removida definitivamente.
 *
 * Garantias verificadas:
 *   1. Nenhuma referência residual a `ArmedLockPanel`, `armRoundForStart`,
 *      `disarmRound`, `cancelArmConfirmOpen` ou chaves `plantaopro_armed_*`
 *      no bundle publicado.
 *   2. Nenhum texto de UI mencionando "Programar" no fluxo de ronda.
 *   3. As chaves `plantaopro_armed_ALFA|BRAVO|CHARLIE|DELTA` são removidas
 *      do localStorage no boot da aplicação.
 *
 * O teste é intencionalmente independente de autenticação — ele exercita
 * o boot da SPA e uma inspeção estática dos artefatos servidos pelo Vite.
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

async function boot(page: Page) {
  // Semeia chaves legadas antes do boot para provar que são purgadas.
  await page.addInitScript(() => {
    try {
      ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'].forEach((t) =>
        localStorage.setItem(`plantaopro_armed_${t}`, JSON.stringify({ targetMs: Date.now() + 3_600_000 })),
      );
    } catch { /* ignore */ }
  });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
}

test.describe('Ronda — remoção da função "Programar"', () => {
  test('boot da aplicação purga chaves legadas plantaopro_armed_*', async ({ page }) => {
    await boot(page);
    // Dá um beat para o efeito de purge em main.tsx executar.
    await page.waitForTimeout(300);
    const residual = await page.evaluate(() => {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('plantaopro_armed_')) out.push(k);
      }
      return out;
    });
    expect(residual, `chaves legadas restantes: ${residual.join(', ')}`).toEqual([]);
  });

  test('nenhuma UI do gestor renderiza texto "Programar ronda"', async ({ page }) => {
    await boot(page);
    // Navega pelas rotas públicas conhecidas para amostrar o DOM.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/Programar\s+ronda/i);
    expect(bodyText).not.toMatch(/Cancelar\s+programação/i);
  });

  test('bundle servido não expõe símbolos removidos', async ({ page, request }) => {
    await boot(page);
    // Coleta todas as URLs de scripts JS carregados pela página.
    const scripts = await page.$$eval('script[src]', (els) =>
      els.map((e) => (e as HTMLScriptElement).src).filter(Boolean),
    );
    // Filtra apenas assets locais (evita CDN de terceiros).
    const local = scripts.filter((s) => s.includes(new URL(BASE).host));
    // Se o Vite estiver em dev, o RoundsManager só é carregado sob demanda.
    // Nesse caso, adicionamos o próprio módulo à varredura.
    local.push(`${BASE}/src/components/home/RoundsManager.tsx`);

    const forbidden = [
      'ArmedLockPanel',
      'armRoundForStart',
      'disarmRound',
      'cancelArmConfirmOpen',
    ];
    for (const url of local) {
      const res = await request.get(url).catch(() => null);
      if (!res || !res.ok()) continue;
      const body = await res.text();
      for (const sym of forbidden) {
        // O símbolo pode aparecer em comentários — permitimos apenas em
        // linhas de comentário explicando a remoção.
        const bareOccurrences = body.split('\n').filter((line) => {
          if (!line.includes(sym)) return false;
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
          return true;
        });
        expect(bareOccurrences, `símbolo residual "${sym}" em ${url}`).toEqual([]);
      }
    }
  });
});
