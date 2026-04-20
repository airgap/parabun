const DEFAULT_LANGS = ["parabun", "pts", "pjs"];
function pickLoader(lang) {
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
export function parabunPreprocess(opts = {}) {
    const langs = new Set(opts.langs ?? DEFAULT_LANGS);
    const transpilerCache = new Map();
    const getTranspiler = (loader) => {
        let t = transpilerCache.get(loader);
        if (!t) {
            t = new Bun.Transpiler({ loader });
            transpilerCache.set(loader, t);
        }
        return t;
    };
    return {
        name: "parabun",
        script({ content, attributes, filename }) {
            const lang = typeof attributes.lang === "string" ? attributes.lang : undefined;
            const shouldRun = opts.all
                ? lang === undefined || lang === "ts" || lang === "tsx" || langs.has(lang)
                : lang !== undefined && langs.has(lang);
            if (!shouldRun)
                return;
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
