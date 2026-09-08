import { test, expect, type Page } from '@playwright/test';

/**
 * Regressão do sticky header do AgentPanel.
 *
 * Valida:
 *  1. Fundo permanece opaco (alpha === 1 OU cor sólida do slate-950) ao rolar.
 *  2. z-index alto o suficiente para não ficar atrás de outras camadas.
 *  3. Conteúdo abaixo NÃO sobrepõe visualmente o header ao rolar.
 *  4. Comportamento consistente ao alternar abas.
 *
 * Pré-requisito: usuário autenticado no preview.
 * Execute:  bunx playwright test tests/e2e/sticky-header-opacity.spec.ts
 */

const STICKY_SELECTOR = '[role="region"][aria-label="Cabeçalho e navegação do painel"]';
const SLATE_950 = 'rgb(2, 6, 23)';

async function readStickyBg(page: Page) {
  return page.$eval(STICKY_SELECTOR, (el) => {
    const cs = getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      zIndex: cs.zIndex,
      position: cs.position,
      top: el.getBoundingClientRect().top,
      height: el.getBoundingClientRect().height,
    };
  });
}

function isOpaque(rgba: string) {
  // "rgb(r, g, b)" → opaco. "rgba(r,g,b,a)" com a<1 → transparente.
  if (rgba.startsWith('rgba')) {
    const match = rgba.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\)/);
    if (match) return parseFloat(match[1]) >= 0.95;
  }
  return true;
}

test.describe('Sticky header — opacidade e empilhamento', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agent-panel', { waitUntil: 'networkidle' });
    await page.waitForSelector(STICKY_SELECTOR, { timeout: 10_000 });
  });

  for (const viewport of [
    { name: 'desktop', width: 1360, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ] as const) {
    test(`${viewport.name} — permanece opaco ao rolar`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const initial = await readStickyBg(page);
      expect(initial.position).toBe('sticky');
      expect(Number(initial.zIndex)).toBeGreaterThanOrEqual(40);
      expect(isOpaque(initial.backgroundColor)).toBe(true);

      // rolagem incremental — mede em vários pontos
      for (const y of [200, 600, 1200, 2000]) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(150);
        const state = await readStickyBg(page);
        expect(state.top).toBeLessThanOrEqual(1); // grudado no topo
        expect(isOpaque(state.backgroundColor)).toBe(true);
        // fallback inline (slate-950) OU translúcido com backdrop-filter
        expect(state.backgroundColor).toMatch(/rgb\(2, 6, 23\)|rgba\(2, 6, 23, 0\.9[5-9]\)/);
      }

      await page.screenshot({
        path: `/tmp/browser/sticky-${viewport.name}-scrolled.png`,
        clip: { x: 0, y: 0, width: viewport.width, height: 260 },
      });
    });

    test(`${viewport.name} — mantém opacidade ao alternar abas`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate(() => window.scrollTo(0, 800));

      for (const tab of ['plantoes', 'bh', 'folgas', 'equipe']) {
        const trigger = page.locator(`[role="tab"][data-value="${tab}"], button[value="${tab}"]`).first();
        if (await trigger.count()) {
          await trigger.click({ trial: false }).catch(() => {});
          await page.waitForTimeout(200);
          const state = await readStickyBg(page);
          expect(isOpaque(state.backgroundColor)).toBe(true);
          expect(state.top).toBeLessThanOrEqual(1);
        }
      }
    });
  }

  test('desktop — nenhum elemento com z-index maior vaza sobre o sticky', async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(200);

    const conflicts = await page.evaluate((sel) => {
      const sticky = document.querySelector(sel) as HTMLElement | null;
      if (!sticky) return [];
      const stickyZ = parseInt(getComputedStyle(sticky).zIndex || '0', 10);
      const stickyRect = sticky.getBoundingClientRect();
      return Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .filter((el) => {
          if (sticky.contains(el) || el.contains(sticky)) return false;
          const cs = getComputedStyle(el);
          const z = parseInt(cs.zIndex || '0', 10);
          if (!Number.isFinite(z) || z <= stickyZ) return false;
          const r = el.getBoundingClientRect();
          const overlaps = !(r.right < stickyRect.left || r.left > stickyRect.right ||
                             r.bottom < stickyRect.top || r.top > stickyRect.bottom);
          return overlaps && cs.position !== 'static' && r.width > 4 && r.height > 4;
        })
        .map((el) => ({ tag: el.tagName, z: getComputedStyle(el).zIndex, cls: el.className }));
    }, STICKY_SELECTOR);

    // toasts/dialogs (Radix Portal, z-100+) são aceitáveis — filtramos por role
    const problematic = conflicts.filter((c) =>
      !String(c.cls).includes('toaster') &&
      !String(c.cls).includes('sonner') &&
      !String(c.cls).includes('DialogOverlay')
    );
    expect(problematic, `Elementos empilhados acima do sticky:\n${JSON.stringify(problematic, null, 2)}`).toEqual([]);
  });
});
