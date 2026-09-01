/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── §3.2 Boundary Rules ────────────────────────────────────────────────
    // kernel must not depend on any context or surface
    {
      name: 'kernel-no-context-or-surface',
      comment: 'kernel/ must never depend on contexts/ or surfaces/ (§3.2)',
      severity: 'error',
      from: { path: '^netlify/functions/_lib/kernel/' },
      to: {
        path: [
          '^netlify/functions/contexts/',
          '^netlify/functions/surfaces/',
        ],
      },
    },
    // contexts must not depend on other contexts (use the owner's public interface)
    // Allow self-imports within the same context (service, repository, index)
    {
      name: 'contexts-no-cross-context',
      comment: "contexts/ must not import other contexts directly — use the owner's exported interface (§3.2)",
      severity: 'error',
      from: { path: '^netlify/functions/contexts/' },
      to: {
        path: '^netlify/functions/contexts/',
        pathNot: '^netlify/functions/contexts/[^/]+/(service|repository|index)\\.ts$',
      },
    },
    // contexts service/index should use repository pattern, not db/client.ts directly
    {
      name: 'contexts-no-raw-db',
      comment: 'contexts/ service/index should not import db/client.ts — use repository (§5.1)',
      severity: 'warn',
      from: {
        path: '^netlify/functions/contexts/',
        pathNot: 'repository\\.ts$',
      },
      to: { path: '^netlify/functions/_lib/db/client\\.ts$' },
    },
    // surfaces must not depend on other surfaces (except index.ts barrel)
    {
      name: 'surfaces-no-cross-surface',
      comment: 'surfaces/ must not import other surfaces/ (§3.2)',
      severity: 'error',
      from: {
        path: '^netlify/functions/surfaces/',
        pathNot: '^netlify/functions/surfaces/index\\.ts$',
      },
      to: { path: '^netlify/functions/surfaces/' },
    },
    // surfaces must only import from contexts and kernel (not from _lib/actions-*)
    {
      name: 'surfaces-no-old-actions',
      comment: 'surfaces/ should import from contexts, not legacy _lib/actions-* (strangler fig)',
      severity: 'warn',
      from: { path: '^netlify/functions/surfaces/' },
      to: { path: '^netlify/functions/_lib/actions-' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: false,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types'],
    },
  },
};
