import { transformBareRead } from "./transforms/bare-read";
import { transformBindings } from "./transforms/bindings";
import { transformBlocks } from "./transforms/blocks";
import { transformDecimal } from "./transforms/decimal";
import { transformDefer } from "./transforms/defer";
import { transformErrorChain } from "./transforms/error-chain";
import { injectUsingHelpers } from "./transforms/inject-helpers";
import { transformMemo } from "./transforms/memo";
import { transformParallel } from "./transforms/parallel";
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
export { injectUsingHelpers, injectWrapImports, transformBareRead, transformBindings, transformBlocks, transformDecimal, transformDefer, transformErrorChain, transformMemo, transformParallel, transformPipeline, transformPure, transformRanges, transformUsingPolyfill, };
//# sourceMappingURL=index.d.ts.map