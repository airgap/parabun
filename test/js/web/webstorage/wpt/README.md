# WPT webstorage conformance results

Vendored from `web-platform-tests/wpt @ 6cd3f1c39e2aec3d58f140aa0ff2991d79eb9991`
(`webstorage/*.window.js`), byte-identical. `run.test.ts` loads each file as
text with a `test` and `window` binding; `testharness-shim.ts` supplies the
`assert_*` and `format_value` globals, ported from `resources/testharness.js`
at the same commit. The suite re-runs itself under `--localstorage-file`,
so `bun bd test test/js/web/webstorage/wpt` needs no flags.

| pass | todo | fail | total |
| ---- | ---- | ---- | ----- |
| 1236 | 4    | 0    | 1240  |

## Vendored

Every `*.window.js` in the upstream directory that runs in one document with
no events, iframes, opened windows or network:

| File                                                     | tests |
| -------------------------------------------------------- | ----- |
| `defineProperty.window.js`                               | 12    |
| `missing_arguments.window.js`                            | 10    |
| `set.window.js`                                          | 20    |
| `storage_builtins.window.js`                             | 2     |
| `storage_clear.window.js`                                | 2     |
| `storage_enumerate.window.js`                            | 4     |
| `storage_functions_not_overwritten.window.js`            | 2     |
| `storage_getitem.window.js`                              | 8     |
| `storage_in.window.js`                                   | 4     |
| `storage_indexing.window.js`                             | 8     |
| `storage_key.window.js`                                  | 22    |
| `storage_key_empty_string.window.js`                     | 2     |
| `storage_length.window.js`                               | 4     |
| `storage_local_quota_independent_from_session.window.js` | 1     |
| `storage_local_setitem_quotaexceedederr.window.js`       | 1     |
| `storage_removeitem.window.js`                           | 8     |
| `storage_session_quota_independent_from_local.window.js` | 1     |
| `storage_session_setitem_quotaexceedederr.window.js`     | 1     |
| `storage_set_value_enumerate.window.js`                  | 2     |
| `storage_setitem.window.js`                              | 1106  |
| `storage_string_conversion.window.js`                    | 2     |
| `storage_supported_property_names.window.js`             | 4     |
| `symbol-props.window.js`                                 | 14    |

Not vendored: `event_constructor.window.js` and
`event_initstorageevent.window.js` (need `StorageEvent`; Parabun fires no
storage events), `storage_local_window_open.window.js` and
`storage_session_window_{open,noopener,reopen}.window.js` (a second document),
`localstorage-cross-origin-iframe.https.window.js` (iframe and a second
origin), and the `.html` tests.

## Known failures (`test.todo`)

Listed in `knownFailures` in `testharness-shim.ts`. Their bodies still run; one
that starts passing fails the suite until its entry is removed.

| Test                                                                                                                  | Cause                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage_local_setitem_quotaexceedederr`: Throws QuotaExceededError when the quota has been exceeded                  | `assert_throws_quotaexceedederror` requires the WebIDL `QuotaExceededError` interface: `self.QuotaExceededError` as the constructor, plus `quota` and `requested` attributes (both `null` here). Bun has no `QuotaExceededError` global and `webstorage.ts` throws `new DOMException(msg, "QuotaExceededError")`, the legacy form Node also uses. The quota itself is enforced; the test fails on the exception's shape. |
| `storage_session_setitem_quotaexceedederr`: Throws QuotaExceededError when the quota has been exceeded                | Same.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `storage_local_quota_independent_from_session`: localStorage retains comparable quota after sessionStorage exhaustion | Same.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `storage_session_quota_independent_from_local`: sessionStorage retains comparable quota after localStorage exhaustion | Same.                                                                                                                                                                                                                                                                                                                                                                                                                    |

The documented `Object.defineProperty(storage, key, { configurable: false })`
divergence is not exercised: `symbol-props.window.js` uses it only with symbol
keys, which land on the Proxy target and behave per spec.
