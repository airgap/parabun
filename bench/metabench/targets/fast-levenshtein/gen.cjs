// Fixed-seed string workload for fast-levenshtein bench.
//
// Realistic workload: one query string + M random-ish candidate strings.
// Perturbations match a spell-check / fuzzy-dictionary lookup pattern.

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

const ALPHA = "abcdefghijklmnopqrstuvwxyz";

function randString(rng, len) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHA[(rng() * 26) | 0];
  return s;
}

function perturb(rng, s, k) {
  // Apply up to k random edits.
  let out = s;
  for (let i = 0; i < k; i++) {
    const kind = (rng() * 3) | 0;
    const pos = (rng() * out.length) | 0;
    if (kind === 0 && out.length > 1) {
      // delete
      out = out.slice(0, pos) + out.slice(pos + 1);
    } else if (kind === 1) {
      // insert
      out = out.slice(0, pos) + ALPHA[(rng() * 26) | 0] + out.slice(pos);
    } else {
      // replace
      out = out.slice(0, pos) + ALPHA[(rng() * 26) | 0] + out.slice(pos + 1);
    }
  }
  return out;
}

function generate({ M = 20000, pairLen = 512 } = {}) {
  const rng = xorshift32(SEED);
  const query = randString(rng, pairLen);
  const candidates = new Array(M);
  // Half the candidates are close (within 2 edits), half are random.
  for (let i = 0; i < M; i++) {
    if (i % 2 === 0) {
      candidates[i] = perturb(rng, query, 1 + ((rng() * 3) | 0));
    } else {
      candidates[i] = randString(rng, pairLen + (((rng() * 7) | 0) - 3));
    }
  }
  return { query, candidates };
}

module.exports = { generate };
