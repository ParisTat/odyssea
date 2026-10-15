// @vitest-environment node
//
// vite.config.ts pulls in esbuild-based plugins whose environment check fails under jsdom,
// so this suite runs in plain Node.
import { describe, expect, test } from 'vitest';
import { buildContentSecurityPolicy, FX_API_ORIGIN } from './vite.config';

describe('buildContentSecurityPolicy', () => {
  const csp = buildContentSecurityPolicy();
  const directive = (name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `));

  test('restricts scripts to self with no unsafe directives', () => {
    expect(csp).toContain("default-src 'self'");
    expect(directive('script-src')).toBe("script-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });

  test('allows only the exchange-rate API as an external connect origin', () => {
    expect(directive('connect-src')).toBe(`connect-src 'self' ${FX_API_ORIGIN}`);
    expect(FX_API_ORIGIN).toMatch(/^https:\/\//);
  });

  test('serves styles and fonts from the site itself only', () => {
    expect(directive('style-src')).toBe("style-src 'self'");
    expect(directive('font-src')).toBe("font-src 'self'");
  });

  test('restricts images to same-origin and data URIs', () => {
    expect(directive('img-src')).toBe("img-src 'self' data:");
  });

  test('blocks plugins and restricts base and form targets', () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });
});
