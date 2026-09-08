import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844  },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'laptop',  width: 1280, height: 900  },
  { name: 'desktop', width: 1920, height: 1080 },
];

for (const vp of VIEWPORTS) {
  test(`PlantaoHome @ ${vp.name} (${vp.width}x${vp.height}) — no horizontal overflow & footer glued to content`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const footer = document.querySelector('footer');
      const fRect = footer?.getBoundingClientRect();
      return {
        scrollW: doc.scrollWidth,
        clientW: doc.clientWidth,
        scrollH: doc.scrollHeight,
        footerBottom: fRect ? fRect.bottom + window.scrollY : null,
      };
    });

    // No horizontal overflow at any breakpoint
    expect(metrics.scrollW).toBeLessThanOrEqual(metrics.clientW);

    // Footer glued to end of content (within 2px tolerance)
    expect(metrics.footerBottom).not.toBeNull();
    expect(Math.abs((metrics.footerBottom ?? 0) - metrics.scrollH)).toBeLessThanOrEqual(2);
  });
}
