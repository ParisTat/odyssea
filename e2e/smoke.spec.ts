import { expect, test, type Page } from '@playwright/test';

async function collectErrors(page: Page): Promise<() => Promise<string[]>> {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = violations;
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return async () => {
    const csp = await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
    return [...errors, ...csp];
  };
}

test.describe('Odyssea smoke test', () => {
  test('home page loads with a heading and no console or CSP errors', async ({ page }) => {
    const getErrors = await collectErrors(page);

    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');

    expect(await getErrors()).toEqual([]);
  });

  test('ships the CSP meta tag and keeps search engines out', async ({ page }) => {
    await page.goto('./');

    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('the trips link navigates to the trips list', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('link', { name: 'All trips' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'All trips' })).toBeVisible();
  });
});
