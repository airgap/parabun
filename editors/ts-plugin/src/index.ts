/**
 * Parabun TypeScript Language Service Plugin
 *
 * Intercepts source text before the TS type checker sees it,
 * desugaring Parabun syntax (pure, |>, ..!, ..&) into
 * valid TypeScript.  All TS features (go-to-def, completions,
 * hover types, diagnostics) work on the desugared code.
 */

import type tslib from "typescript/lib/tsserverlibrary";
import { containsParabunSyntax, transformParabunToTS } from "./transform";

function init(modules: { typescript: typeof tslib }) {
  const ts = modules.typescript;

  function create(info: tslib.server.PluginCreateInfo): tslib.LanguageService {
    const log = (msg: string) => info.project.projectService.logger.info(`[parabun] ${msg}`);
    log("plugin loaded");

    const originalHost = info.languageServiceHost;

    const snapshotCache = new Map<string, { version: string; snapshot: tslib.IScriptSnapshot }>();

    const proxiedHost: tslib.LanguageServiceHost = Object.create(originalHost);

    proxiedHost.getScriptSnapshot = (fileName: string): tslib.IScriptSnapshot | undefined => {
      const original = originalHost.getScriptSnapshot(fileName);
      if (!original) return undefined;

      if (
        (!fileName.endsWith(".ts") &&
          !fileName.endsWith(".tsx") &&
          !fileName.endsWith(".pts") &&
          !fileName.endsWith(".ptsx")) ||
        fileName.endsWith(".d.ts") ||
        fileName.includes("node_modules")
      ) {
        return original;
      }

      const version = originalHost.getScriptVersion(fileName);
      const cached = snapshotCache.get(fileName);
      if (cached && cached.version === version) {
        return cached.snapshot;
      }

      const text = original.getText(0, original.getLength());

      if (!containsParabunSyntax(text)) {
        return original;
      }

      const transformed = transformParabunToTS(text);
      const snapshot = ts.ScriptSnapshot.fromString(transformed);
      snapshotCache.set(fileName, { version, snapshot });
      log(`transformed ${fileName} (${text.length} → ${transformed.length} bytes)`);
      return snapshot;
    };

    const languageService = ts.createLanguageService(proxiedHost);

    const proxy: tslib.LanguageService = Object.create(null);
    for (const k of Object.keys(info.languageService) as (keyof tslib.LanguageService)[]) {
      const orig = info.languageService[k];
      if (typeof orig === "function") {
        (proxy as any)[k] = (...args: any[]) => {
          return (languageService as any)[k]
            ? (languageService as any)[k](...args)
            : (orig as Function).apply(info.languageService, args);
        };
      }
    }

    return proxy;
  }

  return { create };
}

export = init;
