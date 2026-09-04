/**
 * code-index-schema.ts — canonical data structures for the semantic index.
 *
 * Reference definitions for the design in docs/CODE_INDEX_DESIGN.md.
 * Not wired into the app build (docs/ is outside tsconfig "include"): this file is the
 * contract that the implementation must satisfy.
 *
 * Conventions:
 *   - IDs are stable across edits that do not reorder declarations (§3.1).
 *   - `Key` fields (int32) are internal, offset-packed, and process-local.
 *   - `Id` fields are public, string, and safe to persist in caches or URLs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────────

/** Public, stable, human-readable. Offset-free so it survives unrelated edits. */
export type SymId = `sym:${string}#${string}`; // sym:<posixPath>#<qualifiedName>[~<n>]
export type FileId = `file:${string}`; // file:<posixPath>
export type ScopeId = `scope:${string}#${string}`; // scope:<posixPath>#<dotted.scope.path>
export type ModuleId = `ext:${string}` | `asset:${string}` | `unresolved:${string}`;

/** Internal packed key: (fileIdx << 20) | declIndex. Regenerated per parse. */
export type SymKey = number & { readonly __brand: 'SymKey' };
export type FileIdx = number & { readonly __brand: 'FileIdx' };

export type Hash = string; // xxh3 128-bit, hex

// ─────────────────────────────────────────────────────────────────────────────
// Enums (stored as Uint8 in the hot arrays)
// ─────────────────────────────────────────────────────────────────────────────

export const SymbolKind = {
  Module: 1,
  Namespace: 2,
  Class: 3,
  Interface: 4,
  TypeAlias: 5,
  Enum: 6,
  EnumMember: 7,
  Function: 8,
  Method: 9,
  Constructor: 10,
  Property: 11,
  Variable: 12,
  Constant: 13,
  Parameter: 14,
  ImportBinding: 15,
  ExportAlias: 16,
  Component: 17, // .tsx / .astro component
  Hook: 18, // useXxx
} as const;
export type SymbolKind = (typeof SymbolKind)[keyof typeof SymbolKind];

export const ScopeKind = {
  Module: 1,
  Namespace: 2,
  Class: 3,
  Interface: 4,
  Function: 5,
  Arrow: 6,
  Block: 7,
  For: 8,
  Catch: 9,
  Switch: 10,
  ObjectLiteral: 11,
  TypeParams: 12,
  AstroTemplate: 13,
  EnumBody: 14,
} as const;
export type ScopeKind = (typeof ScopeKind)[keyof typeof ScopeKind];

/** How an identifier was used — drives which symbol-level edge is emitted. */
export const OccurrenceRole = {
  Read: 1,
  Write: 2,
  Callee: 3, // → calls edge
  TypeRef: 4, // → references edge
  Property: 5,
  JsxName: 6, // → renders edge
  ImportSpecifier: 7,
  ExportSpecifier: 8,
  Decorator: 9,
  ObjectKey: 10,
} as const;
export type OccurrenceRole = (typeof OccurrenceRole)[keyof typeof OccurrenceRole];

export const EdgeType = {
  Contains: 1,
  Declares: 2,
  Imports: 3,
  ImportsType: 4,
  ImportsDynamic: 5,
  ReExports: 6,
  Calls: 7,
  Reads: 8,
  Writes: 9,
  Extends: 10,
  Implements: 11,
  Instantiates: 12,
  Renders: 13,
  References: 14,
} as const;
export type EdgeType = (typeof EdgeType)[keyof typeof EdgeType];

export const ImportKind = {
  Static: 1,
  Type: 2,
  Dynamic: 3,
  SideEffect: 4, // import './styles.css'
  Asset: 5, // ?raw, .svg, .css
} as const;
export type ImportKind = (typeof ImportKind)[keyof typeof ImportKind];

// ─────────────────────────────────────────────────────────────────────────────
// Nodes
// ─────────────────────────────────────────────────────────────────────────────

export interface Range {
  /** Line 1-based (editor); char 0-based (column). */
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  /** Byte offset into the file — the internal fast path. */
  start: number;
  end: number;
}

export interface FileNode {
  id: FileId;
  idx: FileIdx;
  /** Repo-relative, posix. Lowercased copy used for map keys (NTFS is case-insensitive). */
  path: string;
  lookupPath: string;
  lang: 'ts' | 'tsx' | 'astro' | 'js' | 'mjs' | 'cjs' | 'sql';
  /** §6.1 — three hashes, three different invalidation scopes. */
  hash: Hash; // raw bytes → reparse
  declHash: Hash; // declaration signatures (bodies excluded) → downstream re-bind
  exportHash: Hash; // export table → downstream re-resolve
  size: number;
  mtime: number;
  /** Byte offset of each line start; enables offset ↔ line/col in O(log n). */
  lineIndex: Uint32Array;
  poisoned?: { error: string; at?: Range };
}

export interface DeclRange extends Range {
  /** Which universe resolved this declaration (src / netlify / lib). */
  source?: 'source' | 'lib' | 'merged';
}

export interface SymbolNode {
  id: SymId;
  key: SymKey;
  /** Simple name, e.g. `_mapForm`. */
  name: string;
  /** Dot-joined container chain, e.g. `MyClass.myMethod`, `NS.Inner.CONST`. */
  qualified: string;
  kind: SymbolKind;
  fileIdx: FileIdx;
  scopeId: ScopeId;
  parentKey?: SymKey;
  /**
   * One entry per declaration site. Declaration merging (interface + interface,
   * overloads, namespace merging, declare global) yields ONE symbol with MANY ranges.
   */
  decls: DeclRange[];
  exported: boolean;
  /**
   * Every public name this symbol is reachable by. `export { _mapForm as mapForm }`
   * gives one symbol with name `_mapForm` and exportNames `['mapForm']`.
   */
  exportNames: string[];
  /** Rendered signature for hover, e.g. `function findMasterByWa(wa: string): Promise<...>`. */
  detail?: string;
  typeRef?: string;
  modifiers: {
    async?: boolean;
    static?: boolean;
    abstract?: boolean;
    readonly?: boolean;
    isTypeOnly?: boolean; // import type / export type / inline type specifier
    /** Phase 4: let/const/class bindings are TDZ — a reference before the declaration is flagged, not rebound. */
    tdz?: boolean;
  };
  /** Reference count / PageRank over the symbol graph — ambiguity tiebreaker (§7.1). */
  centrality: number;
  /** Set when an outer symbol is shadowed by an inner one. */
  shadowedBy?: SymKey;
}

export interface ScopeNode {
  id: ScopeId;
  key: number;
  kind: ScopeKind;
  parentKey?: number;
  fileIdx: FileIdx;
  range: Range;
  name?: string;
  /**
   * Declarations this scope owns, in source order — a single list, one push
   * per symbol (no duplication across scopes). Block-scoped names
   * (let/const/class/param/import) are owned by the scope open at their
   * declaration; var + function declarations are owned by the nearest
   * function/module scope, where hoisting makes them visible. An inner-block
   * `let` therefore lives only on its block, a hoisted `var` only on its
   * function scope, and a class never leaves its block.
   */
  symbolKeys: SymKey[];
}

export interface ModuleNode {
  id: ModuleId;
  /** Specifier exactly as written, e.g. `../icons/sprite.svg?raw`. */
  specifier: string;
  kind: ImportKind;
  /** Files that import this module. */
  importers: FileIdx[];
  /** Populated lazily only if a reference actually resolves here. */
  symbols?: SymKey[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Occurrences, references, edges
// ─────────────────────────────────────────────────────────────────────────────

/** A syntactic sighting, before resolution. Over-collected on purpose. */
export interface Occurrence {
  fileIdx: FileIdx;
  range: Range;
  name: string;
  scopeKey: number;
  role: OccurrenceRole;
  /** For Property-role occurrences (member access): the head identifier text
   * when it is a plain identifier (e.g. `base` in `base.member`) — the binder
   * chases the member through the base export when the base is a namespace
   * import. Parse-side only; never serialized to dump documents. */
  base?: string;
  /** Tier 2: the full head chain of a multi-hop member access, root first —
   * `this.repo.get()` records ['this','repo'] on the `get` occurrence so the
   * binder can hop member-by-member. Parse-side only; never serialized. */
  baseChain?: string[];
}

/** An occurrence that bound to something. */
export interface ResolvedReference {
  fileIdx: FileIdx;
  range: Range;
  symKey: SymKey;
  role: OccurrenceRole;
  /** How binding succeeded — `import` is the cross-file case (§4.3). */
  resolvedVia: 'scope' | 'import' | 'global' | 'lib' | 'type';
  /** Phase 4: the reference precedes the TDZ declaration it bound to (§4.1). */
  usedBeforeDecl?: boolean;
}

export type UnresolvedReason =
  | 'global-unknown'
  | 'remote-specifier'
  | 'dynamic-not-analyzable'
  | 'type-only-import-in-value-position'
  | 'export-star-ambiguous'
  | 'module-not-found'
  | 'lib-not-loaded'
  | 'template-component';

export interface UnresolvedReference {
  fileIdx: FileIdx;
  range: Range;
  name: string;
  reason: UnresolvedReason;
}

export interface Edge {
  source: SymKey | FileIdx;
  target: SymKey | FileIdx;
  type: EdgeType;
  /** For module edges: number of symbol references crossing it. Weight 0 = dead import. */
  weight: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Import / export records
// ─────────────────────────────────────────────────────────────────────────────

export interface ImportRecord {
  from: FileIdx;
  /** Resolved target, or `unresolved:` node if resolution failed. */
  to: FileIdx | ModuleId;
  specifier: string;
  kind: ImportKind;
  importedNames: string[];
  renamed?: Array<{ imported: string; local: string }>;
  range: Range;
}

export type ExportEntry =
  | { kind: 'direct'; symKey: SymKey; localName: string }
  /** `export { _mapForm as mapForm }` — one symbol, two names. */
  | { kind: 'alias'; symKey: SymKey; localName: string; exportName: string }
  | { kind: 'default'; symKey: SymKey }
  | { kind: 'star'; fromFileIdx: FileIdx; excludes: string[] }
  /** `export type { X }` — resolves in type positions only. */
  | { kind: 'typeOnly'; symKey: SymKey; localName: string }
  /**
   * `export { x } from './y'` — the barrels' dominant form (§13 Phase 3).
   * Resolution continues in `fromFileIdx` under `targetName` (multi-hop).
   */
  | { kind: 'reExport'; fromFileIdx: FileIdx; targetName: string; isTypeOnly: boolean }
  /** Two `export *` sources provide the same name — never guessed (§4.3). */
  | { kind: 'ambiguous'; candidates: Array<{ symKey: SymKey; fromFileIdx: FileIdx }> };

/** Per-file export surface: the unit of `exportHash` and of cross-file resolution. */
export type ExportTable = Map<string, ExportEntry>;

// ─────────────────────────────────────────────────────────────────────────────
// Storage: structure-of-arrays hot tables + CSR adjacency
// ─────────────────────────────────────────────────────────────────────────────

export interface SymbolTables {
  kind: Uint8Array;
  nameIdx: Int32Array; // interned
  fileIdx: Int32Array;
  parentKey: Int32Array;
  start: Int32Array;
  end: Int32Array;
  flags: Uint16Array;
  centrality: Float32Array;
  count: number;
}

/**
 * Compressed sparse row adjacency:
 *   neighboursOf(k) = targets[offsets[k] .. offsets[k + 1]]
 * O(1) fan-out, ~8 bytes per entry, serializable straight to the snapshot.
 */
export interface Csr<T extends Uint8Array | Uint16Array = Uint8Array> {
  offsets: Int32Array;
  targets: Int32Array;
  meta: T;
}

export interface IndexIndices {
  byName: Map<string, SymKey[]>;
  byExportName: Map<FileIdx, ExportTable>;
  byFile: Map<FileIdx, SymKey[]>;
  revDeps: Map<FileIdx, Set<FileIdx>>;
  moduleGraph: Map<FileIdx, ImportRecord[]>;
  /** Inverted trigram index for substring / fuzzy search. */
  trigrams: Map<string, SymKey[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generations, incremental updates, responses
// ─────────────────────────────────────────────────────────────────────────────

/** Immutable snapshot. Queries pin a generation; commits swap the pointer atomically. */
export interface IndexGeneration {
  epoch: number;
  files: Map<FileIdx, FileNode>;
  symbols: SymbolTables;
  scopes: ScopeNode[];
  refs: Csr;
  edges: Csr;
  unresolved: UnresolvedReference[];
  indices: IndexIndices;
  stats: IndexStats;
  builtAt: number;
}

export interface IndexStats {
  fileCount: number;
  symbolCount: number;
  referenceCount: number;
  unresolvedCount: number;
  stageMs: { discover: number; parse: number; resolve: number; bind: number; commit: number };
  memoryBytes: number;
}

export interface IndexDiff {
  epoch: number;
  addedFiles: string[];
  changedFiles: string[];
  removedFiles: string[];
  invalidatedFiles: string[]; // re-resolved because an exportHash changed
  addedSymbols: SymId[];
  removedSymbols: SymId[];
  ms: number;
}

/** §8.1 — `POST /resolve`. Never substitutes a same-named symbol from another file. */
export interface ResolveResponse {
  query: { file: string; line: number; character: number };
  resolved: {
    symId: SymId;
    name: string;
    kind: SymbolKind;
    container?: string;
    decls: Array<{ uri: string; l: number; c: number }>;
    detail?: string;
    resolvedVia: 'scope' | 'import' | 'global' | 'lib' | 'type';
  } | null;
  /** Same-named symbols elsewhere, ranked by §7.1. Present ⇒ ambiguity, not a guess. */
  alternatives: Array<{ symId: SymId; reason: string }>;
  ambiguous: boolean;
  gen: number;
}

export interface SearchHit {
  symId: SymId;
  name: string;
  qualified: string;
  kind: SymbolKind;
  file: string;
  line: number;
  character: number;
  exported: boolean;
  detail?: string;
  /** 0..1, blended from text match, §7.1 ranking, and centrality. */
  score: number;
}
