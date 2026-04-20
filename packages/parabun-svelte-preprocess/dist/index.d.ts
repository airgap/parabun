import type { PreprocessorGroup } from "svelte/compiler";
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
export declare function parabunPreprocess(opts?: ParabunPreprocessOptions): PreprocessorGroup;
export default parabunPreprocess;
//# sourceMappingURL=index.d.ts.map