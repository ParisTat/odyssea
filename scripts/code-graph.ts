// Builds docs/code-graph.json: every module and top-level declaration in src/ (nodes) and how they relate
// (edges: imports, calls, renders, uses-type, references). Flat arrays with string ids, so it maps
// directly onto two DB tables/collections later.
//
//   npm run graph          regenerate the file
//   npm run graph:check    fail if the committed file is stale (runs in CI)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

export const GRAPH_FILE = 'docs/code-graph.json';
const SCHEMA_VERSION = 1;

export type NodeKind = 'module' | 'data' | 'function' | 'component' | 'hook' | 'class' | 'interface' | 'type' | 'const' | 'enum';
export type EdgeKind = 'imports' | 'calls' | 'renders' | 'uses-type' | 'references';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  name: string;
  file: string;
  line: number;
  exported: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

export interface CodeGraph {
  schemaVersion: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const toPosix = (p: string) => p.split(path.sep).join('/');

function isGraphedSource(relPath: string): boolean {
  return (
    relPath.startsWith('src/') &&
    /\.tsx?$/.test(relPath) &&
    !relPath.endsWith('.d.ts') &&
    !/\.test\.tsx?$/.test(relPath) &&
    !relPath.startsWith('src/test/')
  );
}

function loadProgram(root: string): ts.Program {
  const configPath = path.join(root, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
  return ts.createProgram(parsed.fileNames, parsed.options);
}

function functionKind(name: string, file: string): NodeKind {
  if (/^use[A-Z]/.test(name)) return 'hook';
  if (file.endsWith('.tsx') && /^[A-Z]/.test(name)) return 'component';
  return 'function';
}

function isFunctionLike(node: ts.Node | undefined): boolean {
  return !!node && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}

/** Top-level declarations of a file, as [declaration node, name, kind]. */
function topLevelDeclarations(sf: ts.SourceFile, file: string): [ts.Declaration, string, NodeKind][] {
  return sf.statements.flatMap((statement): [ts.Declaration, string, NodeKind][] => {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      return [[statement, statement.name.text, functionKind(statement.name.text, file)]];
    }
    if (ts.isClassDeclaration(statement) && statement.name) return [[statement, statement.name.text, 'class']];
    if (ts.isInterfaceDeclaration(statement)) return [[statement, statement.name.text, 'interface']];
    if (ts.isTypeAliasDeclaration(statement)) return [[statement, statement.name.text, 'type']];
    if (ts.isEnumDeclaration(statement)) return [[statement, statement.name.text, 'enum']];
    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations
        .filter((d) => ts.isIdentifier(d.name))
        .map((d): [ts.Declaration, string, NodeKind] => {
          const name = (d.name as ts.Identifier).text;
          return [d, name, isFunctionLike(d.initializer) ? functionKind(name, file) : 'const'];
        });
    }
    return [];
  });
}

const isExported = (decl: ts.Declaration) => (ts.getCombinedModifierFlags(decl) & ts.ModifierFlags.Export) !== 0;

const isCallee = (node: ts.Node) =>
  (ts.isCallExpression(node.parent) || ts.isNewExpression(node.parent)) && node.parent.expression === node;

/** How an identifier relates to what it points at; undefined for plain field reads (`expense.paidBy`). */
function edgeKindFor(identifier: ts.Identifier): EdgeKind | undefined {
  const parent = identifier.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
    return isCallee(parent) ? 'calls' : undefined;
  }
  if (isCallee(identifier)) return 'calls';
  if ((ts.isJsxOpeningElement(parent) || ts.isJsxSelfClosingElement(parent)) && parent.tagName === identifier) {
    return 'renders';
  }
  if (ts.isTypeReferenceNode(parent) || ts.isExpressionWithTypeArguments(parent) || ts.isTypeQueryNode(parent)) {
    return 'uses-type';
  }
  return 'references';
}

export function buildCodeGraph(root: string): CodeGraph {
  const program = loadProgram(root);
  const checker = program.getTypeChecker();
  const relOf = (fileName: string) => toPosix(path.relative(root, fileName));

  const nodes = new Map<string, GraphNode>();
  const declIds = new Map<ts.Node, string>();
  const sources = program.getSourceFiles().filter((sf) => isGraphedSource(relOf(sf.fileName)));

  for (const sf of sources) {
    const file = relOf(sf.fileName);
    nodes.set(file, { id: file, kind: 'module', name: path.basename(file), file, line: 1, exported: false });
    for (const [decl, name, kind] of topLevelDeclarations(sf, file)) {
      const id = `${file}#${name}`;
      const line = sf.getLineAndCharacterOfPosition(decl.getStart(sf)).line + 1;
      nodes.set(id, { id, kind, name, file, line, exported: isExported(decl) });
      declIds.set(decl, id);
    }
  }

  const edges = new Map<string, GraphEdge>();
  const addEdge = (from: string, to: string, kind: EdgeKind) => {
    if (from !== to) edges.set(`${from}|${kind}|${to}`, { from, to, kind });
  };

  /** Maps a referenced identifier to the id of the top-level declaration it points at, if it's ours. */
  const targetOf = (identifier: ts.Identifier): string | undefined => {
    let symbol = checker.getSymbolAtLocation(identifier);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    let node: ts.Node | undefined = symbol?.declarations?.[0];
    while (node && !declIds.has(node)) node = node.parent;
    return node ? declIds.get(node) : undefined;
  };

  for (const sf of sources) {
    const file = relOf(sf.fileName);
    for (const statement of sf.statements) {
      if (ts.isImportDeclaration(statement)) {
        const target = checker.getSymbolAtLocation(statement.moduleSpecifier)?.declarations?.[0];
        const targetFile = target && ts.isSourceFile(target) ? relOf(target.fileName) : undefined;
        if (targetFile?.startsWith('src/') && targetFile.endsWith('.json') && !nodes.has(targetFile)) {
          nodes.set(targetFile, { id: targetFile, kind: 'data', name: path.basename(targetFile), file: targetFile, line: 1, exported: false });
        }
        if (targetFile && nodes.has(targetFile)) addEdge(file, targetFile, 'imports');
      }
    }

    for (const [decl] of topLevelDeclarations(sf, file)) {
      const from = declIds.get(decl);
      if (!from) continue;
      const visit = (node: ts.Node): void => {
        const kind = ts.isIdentifier(node) ? edgeKindFor(node) : undefined;
        const to = kind && targetOf(node as ts.Identifier);
        if (kind && to) addEdge(from, to, kind);
        ts.forEachChild(node, visit);
      };
      ts.forEachChild(decl, visit);
    }
  }

  const byKey = <T>(key: (item: T) => string) => (a: T, b: T) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
  return {
    schemaVersion: SCHEMA_VERSION,
    nodes: [...nodes.values()].sort(byKey((n) => n.id)),
    edges: [...edges.values()].sort(byKey((e) => `${e.from}|${e.kind}|${e.to}`)),
  };
}

export function serializeGraph(graph: CodeGraph): string {
  return `${JSON.stringify(graph, null, 2)}\n`;
}

function main(): void {
  const root = path.resolve(import.meta.dirname, '..');
  const outFile = path.join(root, GRAPH_FILE);
  const json = serializeGraph(buildCodeGraph(root));

  if (process.argv.includes('--check')) {
    const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8').replace(/\r\n/g, '\n') : '';
    if (current !== json) {
      console.error(`${GRAPH_FILE} is out of date. Run \`npm run graph\` and commit the result.`);
      process.exit(1);
    }
    process.stdout.write(`${GRAPH_FILE} is up to date.\n`);
    return;
  }

  fs.writeFileSync(outFile, json);
  const { nodes, edges } = JSON.parse(json) as CodeGraph;
  process.stdout.write(`Wrote ${GRAPH_FILE}: ${nodes.length} nodes, ${edges.length} edges.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
