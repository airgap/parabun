import { transformErrorChain } from "./transforms/error-chain";
export type TranspileOptions = {
    /** Source filename — used in error messages only. Default `"<input>"`. */
    filename?: string;
};
export declare function transpile(src: string, _options?: TranspileOptions): string;
export { transformErrorChain };
//# sourceMappingURL=index.d.ts.map