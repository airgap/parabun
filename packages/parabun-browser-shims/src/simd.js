// DEPRECATED: forwards to `@para/simd`. Import from that package
// directly when possible. Kept so existing `parabun-browser-shims/simd`
// consumers don't break during the per-module split — slated for
// removal in 0.4.x.

export * from "@para/simd";
export { default } from "@para/simd";
