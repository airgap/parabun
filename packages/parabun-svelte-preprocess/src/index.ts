import type { PreprocessorGroup, Processed } from "svelte/compiler";

export type ParabunPreprocessOptions = {
  /**
   * Which `<script lang="...">` values should be treated as Parabun.
   * Defaults to ["parabun", "pts", "pjs"].
   */
  langs?: string[];
  /**
   * Also transform plain `<script>` blocks (no `lang`) and `<script lang="ts">`.
   * Useful if you want every script to go through the Parabun transpiler so
   * files can freely use Parabun operators without annotating each block.
   */
  all?: boolean;
};

const DEFAULT_LANGS = ["parabun", "pts", "pjs"];

function pickLoader(lang: string | undefined): "ts" | "tsx" | "jsx" {
  switch (lang) {
    case "pts":
    case "parabun":
    case "ts":
    case undefined:
      return "ts";
    case "ptsx":
    case "tsx":
      return "tsx";
    case "pjs":
    case "pjsx":
    case "jsx":
      return "jsx";
    default:
      return "ts";
  }
}

export function parabunPreprocess(opts: ParabunPreprocessOptions = {}): PreprocessorGroup {
  const langs = new Set(opts.langs ?? DEFAULT_LANGS);
  const transpilerCache = new Map<string, Bun.Transpiler>();

  const getTranspiler = (loader: "ts" | "tsx" | "jsx") => {
    let t = transpilerCache.get(loader);
    if (!t) {
      t = new Bun.Transpiler({ loader });
      transpilerCache.set(loader, t);
    }
    return t;
  };

  return {
    name: "parabun",
    script({ content, attributes, filename }): Processed | undefined {
      const lang = typeof attributes.lang === "string" ? attributes.lang : undefined;
      const shouldRun = opts.all
        ? lang === undefined || lang === "ts" || lang === "tsx" || langs.has(lang)
        : lang !== undefined && langs.has(lang);
      if (!shouldRun) return;

      const code = getTranspiler(pickLoader(lang)).transformSync(content);
      return {
        code,
        attributes: { ...attributes, lang: "ts" },
        dependencies: filename ? [filename] : undefined,
      };
    },
  };
}

export default parabunPreprocess;
