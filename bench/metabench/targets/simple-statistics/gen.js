// Deterministic xorshift-based numeric workload for simple-statistics bench.
// Returns both a plain Array<number> (what the upstream lib accepts) and a
// Float32Array (what the Parabun rewrite uses with @para/simd). Same numbers
// in both — the sum/mean/variance values should agree to single-precision
// across the two paths.

const SEED = 0xc0ffee;

function xorshift32(state) {
    let s = state >>> 0;
    return () => {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        s >>>= 0;
        return s / 0xffffffff;
    };
}

function generateSingle(N, offset = 0) {
    // Values distributed in [0, 1). Avoid negative or very large values so
    // upstream Kahan sum and naive SIMD sum stay numerically close.
    const rng = xorshift32(SEED ^ offset);
    const xF = new Float32Array(N);
    for (let i = 0; i < N; i++) xF[i] = rng();
    return { x: Array.from(xF), xF };
}

function generatePair(N, offset = 0) {
    const rng = xorshift32(SEED ^ offset);
    const xF = new Float32Array(N);
    const yF = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        xF[i] = rng();
        yF[i] = rng();
    }
    return { x: Array.from(xF), y: Array.from(yF), xF, yF };
}

module.exports = { generateSingle, generatePair };
