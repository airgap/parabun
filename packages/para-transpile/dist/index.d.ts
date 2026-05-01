import { transformBareRead } from "./transforms/bare-read";
import { transformBindings } from "./transforms/bindings";
import { transformBlocks } from "./transforms/blocks";
import { transformDefer } from "./transforms/defer";
import { transformErrorChain } from "./transforms/error-chain";
import { injectUsingHelpers } from "./transforms/inject-helpers";
import { transformMemo } from "./transforms/memo";
import { transformPipeline } from "./transforms/pipeline";
import { transformPure } from "./transforms/pure";
import { transformRanges } from "./transforms/ranges";
import { transformUsingPolyfill } from "./transforms/using-polyfill";
import { injectWrapImports } from "./transforms/wrap-imports";
export type TranspileOptions = {
    /** Source filename — used in error messages only. Default `"<input>"`. */
    filename?: string;
};
export declare function transpile(src: string, _options?: TranspileOptions): string;
export { injectUsingHelpers, injectWrapImports, transformBareRead, transformBindings, transformBlocks, transformDefer, transformErrorChain, transformMemo, transformPipeline, transformPure, transformRanges, transformUsingPolyfill, };
//# sourceMappingURL=index.d.ts.map