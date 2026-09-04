/**
 * program.ts — ts.createProgram machinery shared by the differential
 * validation (validate.ts) and the checker-backed member tier (deep-tier.ts).
 * Owns: path normalization, per-file identifier indexes, and the program
 * over the indexed inventory (with .astro frontmatter-stripped sources).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { splitAstroFrontmatter } from './parse.js';
import type { FileNode } from '../../docs/code-index-schema.js';

/** TS normalizes host paths to forward slashes on every OS (§13). */
export const norm = (p: string): string => p.replace(/\\/g, '/');

/**
 * One pass per file: identifier start-offset → node. The full-inventory run
 * queries ~40k occurrences, so a per-occurrence walk would be quadratic.
 */
export function identifierIndex(sf: ts.SourceFile): Map<number, ts.Identifier> {
  const map = new Map<number, ts.Identifier>();
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) map.set(n.getStart(sf), n);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return map;
}

/**
 * Build the checker program over the indexed inventory. rootNames = every
 * indexed file, so any indexed occurrence has a program source; .astro files
 * get the SAME frontmatter-stripped source parse.ts feeds the binder, with a
 * per-file base offset (astroOffset) so positions line up. Throws when the
 * root has no readable tsconfig.json — callers degrade (deep tier returns
 * zero refs) or fail loudly (validation).
 */
export function buildProgram(
  files: FileNode[],
  rootDir: string,
): { program: ts.Program; checker: ts.TypeChecker; astroOffset: Map<string, number> } {
  const tsconfigPath = join(rootDir, 'tsconfig.json');
  const cfg = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (cfg.error) throw new Error('tsconfig read failed: ' + JSON.stringify(cfg.error));
  // allowNonTsExtensions: without it createProgram drops root files whose
  // extension is unknown — i.e. every .astro file (§13 differential validation).
  const parsed = ts.parseJsonConfigFileContent(
    cfg.config,
    ts.sys,
    rootDir,
    { noEmit: true, skipLibCheck: true, allowJs: true, allowNonTsExtensions: true },
    tsconfigPath,
  );

  const rootNames = files.map((f) => join(rootDir, f.path));
  const defaultHost = ts.createCompilerHost(parsed.options, true);
  const astroOffset = new Map<string, number>();
  const astroPaths = new Set(files.filter((f) => f.lang === 'astro').map((f) => norm(join(rootDir, f.path))));

  const host: ts.CompilerHost = {
    ...defaultHost,
    getSourceFile(fileName: string, languageVersion: ts.ScriptTarget): ts.SourceFile | undefined {
      if (astroPaths.has(norm(fileName))) {
        const content = readFileSync(fileName, 'utf8');
        const fm = splitAstroFrontmatter(content);
        const text = fm ? fm.text : '';
        astroOffset.set(norm(fileName), fm ? fm.offset : 0);
        return ts.createSourceFile(fileName, text, languageVersion, true, ts.ScriptKind.TS);
      }
      return defaultHost.getSourceFile(fileName, languageVersion);
    },
  };

  const program = ts.createProgram({ rootNames, options: parsed.options, host });
  return { program, checker: program.getTypeChecker(), astroOffset };
}
