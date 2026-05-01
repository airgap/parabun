export type Region = "code" | "line-comment" | "block-comment" | "string-d" | "string-s" | "string-t" | "regex";
export type Span = {
    start: number;
    end: number;
    region: Region;
};
/**
 * Scan source and return the list of contiguous spans by region. Adjacent
 * spans never share a region (consumers can use `region === "code"` as the
 * "this is real code, rewrites can apply here" gate).
 */
export declare function scanRegions(src: string): Span[];
/**
 * Apply `mapper` to the contents of every "code" region in `src`, leaving
 * strings/comments/regexes untouched. Mapper receives the code chunk and
 * returns the rewritten chunk; lengths can differ.
 */
export declare function rewriteCodeRegions(src: string, mapper: (code: string) => string): string;
//# sourceMappingURL=lex.d.ts.map