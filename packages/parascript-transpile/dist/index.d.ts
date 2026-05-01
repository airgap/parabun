import { transformBindings } from "./transforms/bindings";
import { transformBlocks } from "./transforms/blocks";
import { transformErrorChain } from "./transforms/error-chain";
import { transformPipeline } from "./transforms/pipeline";
import { transformPure } from "./transforms/pure";
import { transformRanges } from "./transforms/ranges";
export type TranspileOptions = {
    /** Source filename — used in error messages only. Default `"<input>"`. */
    filename?: string;
};
export declare function transpile(src: string, _options?: TranspileOptions): string;
export { transformBindings, transformBlocks, transformErrorChain, transformPipeline, transformPure, transformRanges };
//# sourceMappingURL=index.d.ts.map