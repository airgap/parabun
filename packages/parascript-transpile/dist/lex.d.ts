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
/**
 * Find the position of the `}` that matches the `{` at `openPos`, walking
 * through nested braces. Skips braces inside strings, comments, and regex
 * literals using the same scanner as `scanRegions`. Returns -1 if no match.
 *
 * Caller passes `src` (the full source) and the position of an opening `{`.
 * The returned position points at the matching `}`.
 */
export declare function findMatchingBrace(src: string, openPos: number): number;
//# sourceMappingURL=lex.d.ts.map