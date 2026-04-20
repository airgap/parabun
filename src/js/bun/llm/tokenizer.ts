// Llama-3 BPE tokenizer for bun:llm.
//
// The vocab + merge table live inside the GGUF metadata — we don't re-parse
// tokenizer.json. This matches the "llama-bpe" pre-tokenizer (Llama 3's regex
// variant) and GPT-2-style byte-to-unicode mapping for BPE operation.
//
// Algorithm summary:
//   1. Pre-tokenize input text with the Llama-3 regex into chunks.
//   2. For each chunk, UTF-8 encode and map bytes through byteToUnicode[].
//   3. Run classical BPE over the mapped-unicode string using merge ranks.
//   4. Look up each resulting piece in vocab → token id.
//
// Not implemented in v0: splitting input on literal special-token strings
// (e.g. the user pasting "<|eot_id|>" into prompt text — we'd tokenize it
// as bytes rather than token 128009). The generate() loop inserts BOS/EOT
// explicitly, so this doesn't bite for single-shot inference.

// Llama-3 pre-tokenizer regex. Ported verbatim from llama.cpp's llama-vocab.cpp
// (pre-tokenizer "llama-bpe"). JS regex supports everything here under the `u`
// flag: Unicode property escapes (\p{L}/\p{N}) + their negated forms.
//
// The alternation order matters — std::regex and JS regex both pick the first
// matching alternative at each position, so contractions must come before
// \p{L}+ and punctuation runs must come before generic whitespace.
const LLAMA_BPE_REGEX =
  /(?:'[sS]|'[tT]|'[rR][eE]|'[vV][eE]|'[mM]|'[lL][lL]|'[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

// Qwen2 pre-tokenizer regex. Two real differences from llama-bpe: contractions
// are lowercase-only (matches HF tokenizers.json for Qwen2) and numbers are
// split one codepoint at a time (`\p{N}` vs `\p{N}{1,3}`). Getting this wrong
// matters for prompts with digits — "1024" would tokenize as a single piece
// under llama-bpe but as four pieces under qwen2, and each path gives a
// different token-id stream.
const QWEN2_BPE_REGEX =
  /(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

// GPT-2 byte-to-unicode table. Maps every byte 0..255 to a printable Unicode
// codepoint so BPE operations never see control bytes or whitespace. Space
// (0x20) ends up as "Ġ" (U+0120); leading-Ġ in a token means "space before".
function buildByteToUnicode(): { byte2u: string[]; u2byte: Map<string, number> } {
  const bs: number[] = [];
  // The "printable" subset used as-is.
  for (let i = 33; i <= 126; i++) bs.push(i); // !..~
  for (let i = 161; i <= 172; i++) bs.push(i); // ¡..¬
  for (let i = 174; i <= 255; i++) bs.push(i); // ®..ÿ
  const cs: number[] = bs.slice();
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n++;
    }
  }
  const byte2u: string[] = new Array(256);
  const u2byte = new Map<string, number>();
  for (let i = 0; i < bs.length; i++) {
    const ch = String.fromCodePoint(cs[i]);
    byte2u[bs[i]] = ch;
    u2byte.set(ch, bs[i]);
  }
  return { byte2u, u2byte };
}

const { byte2u: BYTE_TO_UNICODE, u2byte: UNICODE_TO_BYTE } = buildByteToUnicode();

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder("utf-8", { fatal: false });

type PreTokenizer = "llama-bpe" | "qwen2";

class LlamaTokenizer {
  readonly vocab: string[]; // id → piece (as stored in GGUF)
  readonly vocabId: Map<string, number>; // piece → id
  readonly mergeRank: Map<string, number>; // "a b" → rank
  // Some GGUFs (notably several Qwen2 builds) don't declare a BOS. We model
  // "no BOS" as -1; `addBos: true` becomes a no-op rather than inserting a
  // sentinel that the model doesn't expect.
  readonly bos: number;
  readonly eos: number;
  readonly pre: PreTokenizer;
  readonly tokenType: Uint8Array; // id → llama_token_type (1 normal, 3 control, …)

  constructor(opts: {
    tokens: string[];
    merges: string[];
    tokenType?: number[];
    bos: number;
    eos: number;
    pre?: PreTokenizer;
  }) {
    this.vocab = opts.tokens;
    this.vocabId = new Map();
    for (let i = 0; i < opts.tokens.length; i++) this.vocabId.set(opts.tokens[i], i);

    this.mergeRank = new Map();
    for (let i = 0; i < opts.merges.length; i++) this.mergeRank.set(opts.merges[i], i);

    this.bos = opts.bos;
    this.eos = opts.eos;
    this.pre = opts.pre ?? "llama-bpe";

    const tt = opts.tokenType ?? [];
    this.tokenType = new Uint8Array(opts.tokens.length);
    for (let i = 0; i < Math.min(tt.length, opts.tokens.length); i++) {
      this.tokenType[i] = tt[i] & 0xff;
    }
  }

  // Text → token ids. By default inserts the BOS token at the front — every
  // Llama-3 chat turn starts with <|begin_of_text|>, so callers almost always
  // want this. Pass `{ addBos: false }` for raw sub-string tokenization. When
  // the tokenizer has no BOS (bos === -1), the flag is silently ignored.
  encode(text: string, opts?: { addBos?: boolean }): number[] {
    const addBos = opts?.addBos ?? true;
    const out: number[] = [];
    if (addBos && this.bos >= 0) out.push(this.bos);

    const regex = this.pre === "qwen2" ? QWEN2_BPE_REGEX : LLAMA_BPE_REGEX;
    // The regex is /g, so match() returns all non-overlapping matches.
    const chunks = text.match(regex);
    if (!chunks) return out;

    for (const chunk of chunks) {
      const bytes = utf8Encoder.encode(chunk);
      let mapped = "";
      for (const b of bytes) mapped += BYTE_TO_UNICODE[b];
      const pieces = bpe(mapped, this.mergeRank);
      for (const piece of pieces) {
        const id = this.vocabId.get(piece);
        if (id === undefined) {
          // Fallback: byte-tokenize unknown pieces, char-by-char. Only fires
          // if BPE produces a piece the vocab doesn't contain, which means
          // the GGUF merge table is inconsistent with the vocab — shouldn't
          // happen for well-formed files, but we handle it rather than
          // inserting an <unk>.
          for (const ch of piece) {
            const charId = this.vocabId.get(ch);
            if (charId === undefined) {
              throw new Error(`bun:llm: tokenizer: no vocab entry for piece "${piece}" or char "${ch}"`);
            }
            out.push(charId);
          }
        } else {
          out.push(id);
        }
      }
    }
    return out;
  }

  // Token ids → text. Concatenates vocab strings, then reverses the byte-to-
  // unicode mapping so control bytes and whitespace come back as themselves.
  // Special tokens (control/user-defined) round-trip verbatim — "<|eot_id|>"
  // stays literal rather than disappearing, which is what a user inspecting
  // a generation stream wants to see.
  decode(ids: number[]): string {
    let concat = "";
    for (const id of ids) {
      if (id < 0 || id >= this.vocab.length) continue;
      concat += this.vocab[id];
    }
    // Reverse the byte-level mapping char-by-char.
    const bytes: number[] = [];
    for (const ch of concat) {
      const b = UNICODE_TO_BYTE.get(ch);
      if (b === undefined) {
        // Non-mapped char (can only happen for control/user-defined tokens
        // that contain literal UTF-8 not produced by BPE — e.g. "<|eot_id|>").
        // Emit the chars as-is by encoding to UTF-8 directly.
        const raw = utf8Encoder.encode(ch);
        for (const rb of raw) bytes.push(rb);
      } else {
        bytes.push(b);
      }
    }
    return utf8Decoder.decode(new Uint8Array(bytes));
  }
}

// Classical BPE: repeatedly find the adjacent pair with the lowest merge rank
// and merge it, until no more merges apply. Quadratic-per-chunk but chunks are
// bounded by the pre-tokenizer regex (typically ≤20 chars), so this is fine
// at generation-time cost.
function bpe(text: string, mergeRank: Map<string, number>): string[] {
  if (text.length <= 1) return [text];
  let pieces = [...text]; // code-point split

  while (pieces.length > 1) {
    let bestIdx = -1;
    let bestRank = Infinity;
    for (let i = 0; i < pieces.length - 1; i++) {
      const key = pieces[i] + " " + pieces[i + 1];
      const rank = mergeRank.get(key);
      if (rank !== undefined && rank < bestRank) {
        bestRank = rank;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;

    const merged = pieces[bestIdx] + pieces[bestIdx + 1];
    pieces = pieces.slice(0, bestIdx).concat([merged], pieces.slice(bestIdx + 2));
  }
  return pieces;
}

// Construct a LlamaTokenizer from a GGUFFile. All the data is already in the
// GGUF metadata — this is just a view adapter. We accept the GGUFFile
// directly rather than its metadata map so callers don't have to remember
// exactly which keys apply.
function fromGGUF(gguf: { metadata: Map<string, unknown> }): LlamaTokenizer {
  const model = gguf.metadata.get("tokenizer.ggml.model");
  if (model !== "gpt2") {
    throw new Error(`bun:llm: tokenizer model "${model}" not supported (want "gpt2")`);
  }
  const preRaw = gguf.metadata.get("tokenizer.ggml.pre");
  let pre: PreTokenizer;
  if (preRaw === "llama-bpe") pre = "llama-bpe";
  else if (preRaw === "qwen2") pre = "qwen2";
  else throw new Error(`bun:llm: tokenizer pre "${preRaw}" not supported (want "llama-bpe" or "qwen2")`);
  const tokens = gguf.metadata.get("tokenizer.ggml.tokens");
  const merges = gguf.metadata.get("tokenizer.ggml.merges");
  const tokenType = gguf.metadata.get("tokenizer.ggml.token_type") as number[] | undefined;
  const bosRaw = gguf.metadata.get("tokenizer.ggml.bos_token_id");
  const eosRaw = gguf.metadata.get("tokenizer.ggml.eos_token_id");
  if (!Array.isArray(tokens)) throw new Error("bun:llm: missing tokenizer.ggml.tokens");
  if (!Array.isArray(merges)) throw new Error("bun:llm: missing tokenizer.ggml.merges");
  if (typeof eosRaw !== "number") throw new Error("bun:llm: missing tokenizer.ggml.eos_token_id");
  // BOS is optional: some Qwen2 builds omit it (chat flows inject <|im_start|>
  // directly), and we treat missing-BOS as "don't prepend anything".
  const bos = typeof bosRaw === "number" ? bosRaw : -1;
  return new LlamaTokenizer({
    tokens: tokens as string[],
    merges: merges as string[],
    tokenType,
    bos,
    eos: eosRaw,
    pre,
  });
}

export default {
  LlamaTokenizer,
  fromGGUF,
};
