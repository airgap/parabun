# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482465097527 |
| endTime | 482466577333 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 91 | flushSync | 5 | 0.42% | 946 | 78.64% |
| 2 | 92 | flush | 26 | 2.16% | 688 | 57.19% |
| 3 | 93 | #process | 63 | 5.24% | 662 | 55.03% |
| 4 | 94 | flush_queued_effects | 22 | 1.83% | 574 | 47.71% |
| 5 | 95 | is_dirty | 6 | 0.50% | 501 | 41.65% |
| 6 | 96 | update_derived | 5 | 0.42% | 494 | 41.06% |
| 7 | 97 | execute_derived | 14 | 1.16% | 488 | 40.57% |
| 8 | 98 | update_reaction | 75 | 6.23% | 474 | 39.40% |
| 9 | 112 | get | 251 | 20.86% | 356 | 29.59% |
| 10 | 101 | set | 13 | 1.08% | 245 | 20.37% |
| 11 | 102 | internal_set | 37 | 3.08% | 232 | 19.29% |
| 12 | 109 | ensure | 10 | 0.83% | 125 | 10.39% |
| 13 | 110 | Batch | 3 | 0.25% | 111 | 9.23% |
| 14 | 111 | Batch | 108 | 8.98% | 108 | 8.98% |
| 15 | 46 | flushSync | 1 | 0.08% | 101 | 8.40% |
| 16 | 86 | (idle) | 94 | 7.81% | 94 | 7.81% |
| 17 | 53 | flush | 6 | 0.50% | 66 | 5.49% |
| 18 | 125 | is_dirty | 59 | 4.90% | 60 | 4.99% |
| 19 | 54 | #process | 7 | 0.58% | 60 | 4.99% |
| 20 | 55 | flush_queued_effects | 3 | 0.25% | 52 | 4.32% |
| 21 | 118 | update_effect | 13 | 1.08% | 50 | 4.16% |
| 22 | 41 | (garbage collector) | 49 | 4.07% | 49 | 4.07% |
| 23 | 104 | mark_reactions | 12 | 1.00% | 45 | 3.74% |
| 24 | 115 | update_derived | 3 | 0.25% | 42 | 3.49% |
| 25 | 56 | is_dirty | 1 | 0.08% | 41 | 3.41% |

## Nodes
| ID | Parent ID | Function | URL | Line | Column | Hit count | Children | Deopt reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 10 |  |
| 10 | 9 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 11 |  |
| 11 | 10 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 12 |  |
| 12 | 11 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 14 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 15 |  |
| 15 | 14 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 16 |  |
| 16 | 15 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 17 |  |
| 17 | 16 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 19 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 20, 28 |  |
| 20 | 19 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 21 |  |
| 21 | 20 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 22 |  |
| 22 | 21 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 24 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 25 |  |
| 25 | 24 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 26 |  |
| 26 | 25 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 27 |  |
| 27 | 26 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 28 | 19 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 29 |  |
| 29 | 28 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 31 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 32 |  |
| 32 | 31 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 33 |  |
| 33 | 32 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 34 |  |
| 34 | 33 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 35 |  |
| 35 | 34 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 36 |  |
| 36 | 35 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 37 |  |
| 37 | 36 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 38 |  |
| 38 | 37 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 40 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 46 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 1 | 53 |  |
| 48 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 3 | 49 |  |
| 49 | 48 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 2 | 50, 68, 71 |  |
| 50 | 49 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 51 |  |
| 51 | 50 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 52 |  |
| 52 | 51 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 20 |  |  |
| 68 | 49 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 69 |  |
| 69 | 68 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 70 |  |
| 70 | 69 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 |  |  |
| 71 | 49 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 3 |  |  |
| 53 | 46 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 6 | 54 |  |
| 54 | 53 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 7 | 55, 63 |  |
| 55 | 54 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 3 | 56, 64 |  |
| 56 | 55 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 57 |  |
| 57 | 56 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 58 |  |
| 58 | 57 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 59 |  |
| 59 | 58 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 | 76 |  |
| 61 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 17 | 62, 81, 85 |  |
| 62 | 61 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 66 |  |
| 66 | 62 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 67 |  |
| 67 | 66 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 80 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 81 | 61 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 84 |  |
| 84 | 81 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 85 | 61 | reconnect | packages/svelte/src/internal/client/runtime.js | 696 | 19 | 1 |  |  |
| 76 | 59 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 0 | 77 |  |
| 77 | 76 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 3 | 78 |  |
| 78 | 77 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 0 | 79 |  |
| 79 | 78 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 1 |  |  |
| 64 | 55 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 1 | 65 |  |
| 65 | 64 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 74 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 63 | 54 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 1 |  |  |
| 41 |  | (garbage collector) |  | 0 | 0 | 49 |  |  |
| 83 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 86 |  | (idle) |  | 0 | 0 | 94 |  |  |
| 91 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 5 | 92, 124 |  |
| 92 | 91 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 26 | 93 |  |
| 93 | 92 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 63 | 94, 131, 139, 142, 148, 155, 172 |  |
| 94 | 93 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 22 | 95, 118, 159 |  |
| 95 | 94 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 96, 167 |  |
| 96 | 95 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 5 | 97, 149 |  |
| 97 | 96 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 14 | 98 |  |
| 98 | 97 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 75 | 113, 123, 153, 158 |  |
| 112 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 251 | 115, 125, 128, 168 |  |
| 115 | 112 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 116, 126, 154 |  |
| 116 | 115 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 117 |  |
| 117 | 116 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 23 | 129 |  |
| 129 | 117 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 133 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 151 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 126 | 115 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 | 170 |  |
| 170 | 126 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 154 | 115 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 125 | 112 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 59 | 161 |  |
| 161 | 125 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 128 | 112 | reconnect | packages/svelte/src/internal/client/runtime.js | 696 | 19 | 1 |  |  |
| 168 | 112 | unfreeze_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 464 | 41 | 2 |  |  |
| 152 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 113 | 98 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 2 | 114 |  |
| 114 | 113 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 20 | 141, 145, 162 |  |
| 141 | 114 | freeze_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 439 | 39 | 1 |  |  |
| 145 | 114 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 4 | 146 |  |
| 146 | 145 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 6 |  |  |
| 162 | 114 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 | 166 |  |
| 166 | 162 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 123 | 98 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 153 | 98 | effect_tracking | packages/svelte/src/internal/client/reactivity/effects.js | 186 | 32 | 1 |  |  |
| 158 | 98 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 149 | 96 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 167 | 95 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 118 | 94 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 13 | 119 |  |
| 119 | 118 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 23 | 171 |  |
| 121 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 9 | 160, 163 |  |
| 160 | 121 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 163 | 121 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 164 |  |
| 164 | 163 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 165 |  |
| 165 | 164 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 171 | 119 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 159 | 94 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 131 | 93 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 10 |  |  |
| 139 | 93 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 4 |  |  |
| 142 | 93 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 6 |  |  |
| 148 | 93 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 3 |  |  |
| 155 | 93 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 0 | 156 |  |
| 156 | 155 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 172 | 93 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 101 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 13 | 102 |  |
| 102 | 101 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 37 | 103, 104, 109, 122, 130 |  |
| 103 | 102 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 4 |  |  |
| 104 | 102 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 12 | 105, 127, 138 |  |
| 105 | 104 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 11 | 106, 169, 173 |  |
| 106 | 105 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 107, 140 |  |
| 107 | 106 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 | 108 |  |
| 108 | 107 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 5 |  |  |
| 140 | 106 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 169 | 105 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 173 | 105 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 127 | 104 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 138 | 104 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 109 | 102 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 10 | 110, 157 |  |
| 110 | 109 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 3 | 111 |  |
| 111 | 110 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 108 |  |  |
| 157 | 109 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 4 |  |  |
| 122 | 102 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 130 | 102 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 18 |  |  |
| 124 | 91 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 2 |  |  |
| 135 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 | 136 |  |
| 136 | 135 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 137 |  |
| 137 | 136 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 1 | 143 |  |
| 143 | 137 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 144 |  |
| 144 | 143 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 3 |  |  |
| 147 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
