// @vitest-environment node
import { describe, expect, test } from 'vitest';
import path from 'path';
import { buildCodeGraph } from './code-graph';

const graph = buildCodeGraph(path.resolve(import.meta.dirname, '..'));
const hasEdge = (from: string, to: string, kind: string) =>
  graph.edges.some((e) => e.from === from && e.to === to && e.kind === kind);
const node = (id: string) => graph.nodes.find((n) => n.id === id);

describe('buildCodeGraph', () => {
  test('lists modules and their top-level declarations with kinds', () => {
    expect(node('src/domain/budget.ts')).toMatchObject({ kind: 'module' });
    expect(node('src/domain/budget.ts#summarizeBudget')).toMatchObject({ kind: 'function', exported: true });
    expect(node('src/components/Layout.tsx#Layout')).toMatchObject({ kind: 'component' });
    expect(node('src/domain/tripRepository.ts#TripRepository')).toMatchObject({ kind: 'interface' });
    expect(node('src/domain/schemas.ts#TripDataError')).toMatchObject({ kind: 'class' });
  });

  test('records function calls, including private helpers', () => {
    expect(hasEdge('src/domain/budget.ts#summarizeBudget', 'src/domain/budget.ts#toEurCents', 'calls')).toBe(true);
    expect(hasEdge('src/domain/budget.ts#summarizeBudget', 'src/domain/budget.ts#splitEvenly', 'calls')).toBe(true);
  });

  test('records calls across modules through imports', () => {
    expect(hasEdge('src/domain/fx.ts#fetchEurRate', 'src/domain/activeTrip.ts#toIsoDate', 'calls')).toBe(true);
    expect(
      hasEdge('src/domain/jsonTripRepository.ts#loadBundle', 'src/domain/schemas.ts#parseTripBundle', 'calls'),
    ).toBe(true);
  });

  test('records which components render which', () => {
    expect(hasEdge('src/App.tsx#App', 'src/components/Layout.tsx#Layout', 'renders')).toBe(true);
    expect(hasEdge('src/App.tsx#App', 'src/pages/NotFoundPage.tsx#NotFoundPage', 'renders')).toBe(true);
  });

  test('records module imports and type usage', () => {
    expect(hasEdge('src/domain/budget.ts', 'src/domain/schemas.ts', 'imports')).toBe(true);
    expect(hasEdge('src/domain/budget.ts#summarizeBudget', 'src/domain/budget.ts#BudgetSummary', 'uses-type')).toBe(true);
  });

  test('leaves out tests and test fixtures', () => {
    expect(graph.nodes.some((n) => n.file.includes('.test.') || n.file.startsWith('src/test/'))).toBe(false);
  });

  test('only has edges between known nodes, sorted and without duplicates', () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    expect(graph.edges.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);

    const keys = graph.edges.map((e) => `${e.from}|${e.kind}|${e.to}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([...keys].sort());
  });
});
