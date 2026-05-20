# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482458085806 |
| endTime | 482459169837 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 72 | flushSync | 5 | 0.57% | 645 | 73.46% |
| 2 | 79 | flush | 34 | 3.87% | 386 | 43.96% |
| 3 | 80 | #process | 59 | 6.72% | 352 | 40.09% |
| 4 | 81 | flush_queued_effects | 21 | 2.39% | 273 | 31.09% |
| 5 | 74 | set | 36 | 4.10% | 246 | 28.02% |
| 6 | 75 | internal_set | 28 | 3.19% | 210 | 23.92% |
| 7 | 82 | is_dirty | 7 | 0.80% | 204 | 23.23% |
| 8 | 83 | update_derived | 3 | 0.34% | 195 | 22.21% |
| 9 | 84 | execute_derived | 2 | 0.23% | 189 | 21.53% |
| 10 | 85 | update_reaction | 16 | 1.82% | 187 | 21.30% |
| 11 | 87 | get | 171 | 19.48% | 171 | 19.48% |
| 12 | 76 | ensure | 5 | 0.57% | 120 | 13.67% |
| 13 | 77 | Batch | 4 | 0.46% | 114 | 12.98% |
| 14 | 78 | Batch | 110 | 12.53% | 110 | 12.53% |
| 15 | 67 | (idle) | 94 | 10.71% | 94 | 10.71% |
| 16 | 44 | flushSync | 0 | 0.00% | 69 | 7.86% |
| 17 | 39 | (garbage collector) | 55 | 6.26% | 55 | 6.26% |
| 18 | 90 | update_effect | 16 | 1.82% | 47 | 5.35% |
| 19 | 47 | flush | 6 | 0.68% | 41 | 4.67% |
| 20 | 48 | #process | 9 | 1.03% | 35 | 3.99% |
| 21 | 88 | mark_reactions | 17 | 1.94% | 33 | 3.76% |
| 22 | 91 | update_reaction | 10 | 1.14% | 30 | 3.42% |
| 23 | 46 | set | 6 | 0.68% | 28 | 3.19% |
| 24 | 97 | capture | 25 | 2.85% | 25 | 2.85% |
| 25 | 50 | flush_queued_effects | 3 | 0.34% | 23 | 2.62% |

## Nodes
| ID | Parent ID | Function | URL | Line | Column | Hit count | Children | Deopt reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 9 |  |
| 9 | 8 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 10 |  |
| 10 | 9 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 11 |  |
| 11 | 10 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 14 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 15 |  |
| 15 | 14 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 16 |  |
| 16 | 15 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 17 |  |
| 17 | 16 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 19 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 20 |  |
| 20 | 19 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 21 |  |
| 21 | 20 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 22 |  |
| 22 | 21 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 24 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 25 |  |
| 25 | 24 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 26 |  |
| 26 | 25 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 27 |  |
| 27 | 26 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 29 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 30 |  |
| 30 | 29 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 31 |  |
| 31 | 30 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 32 |  |
| 32 | 31 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 33 |  |
| 33 | 32 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 34 |  |
| 34 | 33 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 35 |  |
| 35 | 34 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 36 |  |
| 36 | 35 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 38 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 44 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 47 |  |
| 46 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 6 | 58 |  |
| 58 | 46 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 4 | 59, 60, 66 |  |
| 59 | 58 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 5 |  |  |
| 60 | 58 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 1 | 61 |  |
| 61 | 60 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 62 |  |
| 62 | 61 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 11 |  |  |
| 66 | 58 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 47 | 44 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 6 | 48 |  |
| 48 | 47 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 9 | 49, 50 |  |
| 49 | 48 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 3 |  |  |
| 50 | 48 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 3 | 51, 64 |  |
| 51 | 50 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 52 |  |
| 52 | 51 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 53 |  |
| 53 | 52 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 54 |  |
| 54 | 53 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 56 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 14 |  |  |
| 64 | 50 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 65 |  |
| 65 | 64 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 39 |  | (garbage collector) |  | 0 | 0 | 55 |  |  |
| 67 |  | (idle) |  | 0 | 0 | 94 |  |  |
| 72 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 5 | 79, 120 |  |
| 74 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 36 | 75 |  |
| 75 | 74 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 28 | 76, 88, 93, 97, 112 |  |
| 76 | 75 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 5 | 77, 124 |  |
| 77 | 76 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 4 | 78 |  |
| 78 | 77 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 110 |  |  |
| 124 | 76 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 1 |  |  |
| 88 | 75 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 17 | 89, 111 |  |
| 89 | 88 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 104 |  |
| 104 | 89 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 105 |  |
| 105 | 104 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 11 |  |  |
| 111 | 88 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 93 | 75 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 3 |  |  |
| 97 | 75 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 25 |  |  |
| 112 | 75 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 79 | 72 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 34 | 80 |  |
| 80 | 79 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 59 | 81, 95, 96, 128, 129, 131 |  |
| 81 | 80 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 21 | 82, 90, 121 |  |
| 82 | 81 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 83, 92 |  |
| 83 | 82 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 84, 125, 127 |  |
| 84 | 83 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 85 |  |
| 85 | 84 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 16 |  |  |
| 87 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 171 |  |  |
| 125 | 83 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 127 | 83 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 92 | 82 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 90 | 81 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 16 | 91, 132 |  |
| 91 | 90 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 10 | 123, 130 |  |
| 109 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 16 | 126 |  |
| 126 | 109 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 123 | 91 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 130 | 91 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 132 | 90 | execute_effect_teardown | packages/svelte/src/internal/client/reactivity/effects.js | 438 | 40 | 1 |  |  |
| 121 | 81 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 95 | 80 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 16 |  |  |
| 96 | 80 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 128 | 80 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 1 |  |  |
| 129 | 80 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 |  |  |
| 131 | 80 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 1 |  |  |
| 107 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 | 113 |  |
| 113 | 107 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 2 | 114, 116 |  |
| 114 | 113 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 115 |  |
| 115 | 114 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 1 |  |  |
| 116 | 113 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 117 |  |
| 117 | 116 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 118 |  |
| 118 | 117 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 119 |  |
| 119 | 118 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 120 | 72 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 3 |  |  |
| 94 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 | 110 |  |
| 110 | 94 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 122 |  | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 1 |  |  |
