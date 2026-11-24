import { expect, test } from '@playwright/test';

test('las acciones están encima de las secciones y conservan sus colores en los tres temas', async ({ page }) => {
  await page.goto('/ThesaurusScriptorumLatinorum/');
  for (const width of [320, 360, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark', 'oled']) {
      await page.locator('#app-theme').selectOption(theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const layout = await page.locator('header').evaluate(header => {
        const actions = [...header.querySelectorAll('.app-actions > button')];
        const row = header.querySelector('.app-actions').getBoundingClientRect();
        const nav = header.querySelector('nav').getBoundingClientRect();
        return {
          actionBottom: row.bottom,
          navTop: nav.top,
          domOrder: Boolean(header.querySelector('.app-actions')
            .compareDocumentPosition(header.querySelector('nav')) & Node.DOCUMENT_POSITION_FOLLOWING),
          colors: actions.map(button => getComputedStyle(button).backgroundColor),
          foregrounds: actions.map(button => getComputedStyle(button).color),
          overflow: actions.some(button => {
            const rect = button.getBoundingClientRect();
            return rect.left < 0 || rect.right > innerWidth;
          }),
        };
      });
      expect(layout.domOrder).toBe(true);
      expect(layout.actionBottom).toBeLessThanOrEqual(layout.navTop);
      expect(layout.overflow).toBe(false);
      expect(new Set(layout.colors).size).toBe(6);
      expect(layout.foregrounds).toEqual(Array(6).fill('rgb(255, 255, 255)'));
    }
  }
});
