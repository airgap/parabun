# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482442100282 |
| endTime | 482447144621 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 127 | flushSync | 14 | 0.32% | 3719 | 84.29% |
| 2 | 128 | flush | 143 | 3.24% | 2438 | 55.26% |
| 3 | 129 | #process | 322 | 7.30% | 2293 | 51.97% |
| 4 | 130 | flush_queued_effects | 113 | 2.56% | 1848 | 41.89% |
| 5 | 131 | is_dirty | 41 | 0.93% | 1493 | 33.84% |
| 6 | 143 | set | 49 | 1.11% | 1257 | 28.49% |
| 7 | 132 | update_derived | 17 | 0.39% | 1211 | 27.45% |
| 8 | 144 | internal_set | 146 | 3.31% | 1208 | 27.38% |
| 9 | 133 | execute_derived | 32 | 0.73% | 1180 | 26.75% |
| 10 | 134 | update_reaction | 74 | 1.68% | 1144 | 25.93% |
| 11 | 137 | get | 314 | 7.12% | 1061 | 24.05% |
| 12 | 138 | update_derived | 42 | 0.95% | 730 | 16.55% |
| 13 | 139 | execute_derived | 128 | 2.90% | 645 | 14.62% |
| 14 | 155 | ensure | 25 | 0.57% | 556 | 12.60% |
| 15 | 156 | Batch | 1 | 0.02% | 525 | 11.90% |
| 16 | 157 | Batch | 524 | 11.88% | 524 | 11.88% |
| 17 | 140 | update_reaction | 352 | 7.98% | 495 | 11.22% |
| 18 | 60 | flushSync | 4 | 0.09% | 415 | 9.41% |
| 19 | 145 | mark_reactions | 173 | 3.92% | 411 | 9.32% |
| 20 | 67 | flush | 21 | 0.48% | 284 | 6.44% |
| 21 | 68 | #process | 37 | 0.84% | 263 | 5.96% |
| 22 | 159 | update_effect | 63 | 1.43% | 241 | 5.46% |
| 23 | 147 | is_dirty | 38 | 0.86% | 240 | 5.44% |
| 24 | 153 | mark_reactions | 152 | 3.45% | 226 | 5.12% |
| 25 | 69 | flush_queued_effects | 12 | 0.27% | 211 | 4.78% |

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
| 30 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 31 |  |
| 31 | 30 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 32 |  |
| 32 | 31 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 33 |  |
| 33 | 32 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 35 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 36 |  |
| 36 | 35 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 37 |  |
| 37 | 36 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 38 |  |
| 38 | 37 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 39 |  |
| 39 | 38 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 40 |  |
| 40 | 39 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 41 |  |
| 41 | 40 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 42 |  |
| 42 | 41 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 45 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 50, 52 |  |
| 50 | 45 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 52 | 45 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 53 |  |
| 53 | 52 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 54 |  |
| 54 | 53 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 47 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 48 |  |
| 48 | 47 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 49 |  |
| 49 | 48 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 60 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 4 | 67, 118 |  |
| 62 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 7 | 63 |  |
| 63 | 62 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 9 | 64, 85, 88, 115 |  |
| 64 | 63 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 2 | 65 |  |
| 65 | 64 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 66 |  |
| 66 | 65 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 66 |  |  |
| 85 | 63 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 15 | 86 |  |
| 86 | 85 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 110 |  |
| 110 | 86 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 111 |  |
| 111 | 110 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 112 |  |
| 112 | 111 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 5 |  |  |
| 88 | 63 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 10 |  |  |
| 115 | 63 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 67 | 60 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 21 | 68 |  |
| 68 | 67 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 37 | 69, 92, 95 |  |
| 69 | 68 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 12 | 70, 71, 117 |  |
| 70 | 69 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 7 | 89 |  |
| 89 | 70 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 91 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 9 |  |  |
| 71 | 69 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 72, 76 |  |
| 72 | 71 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 73 |  |
| 73 | 72 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 74 |  |
| 74 | 73 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 | 96 |  |
| 81 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 37 | 82, 103 |  |
| 82 | 81 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 8 | 83, 98, 107, 113 |  |
| 83 | 82 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 15 | 84, 101 |  |
| 84 | 83 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 43 | 87 |  |
| 87 | 84 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 94 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 18 |  |  |
| 101 | 83 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 98 | 82 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 107 | 82 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 3 |  |  |
| 113 | 82 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 3 |  |  |
| 103 | 81 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 96 | 74 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 76 | 71 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 77, 109 |  |
| 77 | 76 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 78, 104 |  |
| 78 | 77 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 79 |  |
| 79 | 78 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 10 | 97 |  |
| 97 | 79 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 106 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 6 |  |  |
| 104 | 77 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 109 | 76 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 |  |  |
| 117 | 69 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 92 | 68 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 3 |  |  |
| 95 | 68 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 12 |  |  |
| 118 | 60 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 1 |  |  |
| 114 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 116 |  |
| 116 | 114 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 51 |  | (garbage collector) |  | 0 | 0 | 148 |  |  |
| 108 |  | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 |  |  |
| 122 |  | (idle) |  | 0 | 0 | 76 |  |  |
| 127 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 14 | 128, 186 |  |
| 128 | 127 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 143 | 129, 241, 245 |  |
| 129 | 128 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 322 | 130, 171, 175, 181, 189, 191, 201, 246 |  |
| 130 | 129 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 113 | 131, 159, 182 |  |
| 131 | 130 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 41 | 132, 147, 225 |  |
| 132 | 131 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 17 | 133, 179, 204, 219 |  |
| 133 | 132 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 32 | 134, 183 |  |
| 134 | 133 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 74 | 210 |  |
| 137 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 314 | 138, 169 |  |
| 138 | 137 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 42 | 139, 174, 177, 188 |  |
| 139 | 138 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 128 | 140, 166, 187 |  |
| 140 | 139 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 352 | 185, 217, 248 |  |
| 161 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 137 |  |  |
| 185 | 140 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 4 |  |  |
| 217 | 140 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 248 | 140 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 166 | 139 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 2 |  |  |
| 187 | 139 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 20 |  |  |
| 174 | 138 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 177 | 138 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 19 | 178 |  |
| 178 | 177 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 10 |  |  |
| 188 | 138 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 13 |  |  |
| 169 | 137 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 17 |  |  |
| 211 |  | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 237 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 210 | 134 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 183 | 133 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 4 |  |  |
| 179 | 132 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 3 | 224 |  |
| 224 | 179 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 204 | 132 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 6 |  |  |
| 219 | 132 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 2 |  |  |
| 147 | 131 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 38 | 148, 202 |  |
| 148 | 147 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 13 | 149, 172, 192, 203, 238 |  |
| 149 | 148 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 36 | 150, 184, 239 |  |
| 150 | 149 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 87 | 205, 223 |  |
| 152 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 43 |  |  |
| 205 | 150 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 223 | 150 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 184 | 149 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 239 | 149 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 172 | 148 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 192 | 148 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 2 |  |  |
| 203 | 148 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 5 | 207 |  |
| 207 | 203 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 238 | 148 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 202 | 147 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 |  |  |
| 225 | 131 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 159 | 130 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 63 | 162, 190, 198, 206 |  |
| 162 | 159 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 84 | 165, 193 |  |
| 165 | 162 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 9 |  |  |
| 168 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 65 | 176 |  |
| 176 | 168 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 |  |  |
| 250 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 193 | 162 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 190 | 159 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 198 | 159 | execute_effect_teardown | packages/svelte/src/internal/client/reactivity/effects.js | 438 | 40 | 2 |  |  |
| 206 | 159 | destroy_effect_children | packages/svelte/src/internal/client/reactivity/effects.js | 459 | 40 | 3 |  |  |
| 182 | 130 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 171 | 129 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 14 |  |  |
| 175 | 129 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 72 |  |  |
| 181 | 129 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 15 |  |  |
| 189 | 129 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 5 | 218 |  |
| 218 | 189 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 3 |  |  |
| 191 | 129 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 12 |  |  |
| 201 | 129 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 246 | 129 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 241 | 128 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 1 |  |  |
| 245 | 128 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 1 |  |  |
| 143 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 49 | 144 |  |
| 144 | 143 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 146 | 145, 155, 160, 212, 244 |  |
| 145 | 144 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 173 | 146, 153, 197, 232 |  |
| 146 | 145 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 8 |  |  |
| 153 | 145 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 152 | 154, 158, 208 |  |
| 154 | 153 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 8 |  |  |
| 158 | 153 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 24 | 163, 200, 230 |  |
| 163 | 158 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 3 | 164 |  |
| 164 | 163 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 29 |  |  |
| 200 | 158 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 230 | 158 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 208 | 153 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 7 |  |  |
| 197 | 145 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 232 | 145 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 233 |  |
| 233 | 232 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 155 | 144 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 25 | 156, 209 |  |
| 156 | 155 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 1 | 157 |  |
| 157 | 156 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 524 |  |  |
| 209 | 155 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 6 |  |  |
| 160 | 144 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 88 | 249 |  |
| 249 | 160 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 212 | 144 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 5 |  |  |
| 244 | 144 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 186 | 127 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 6 |  |  |
| 195 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 196 |  |
| 196 | 195 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 222, 227 |  |
| 222 | 196 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 231 |  |
| 231 | 222 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 227 | 196 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 228 |  |
| 228 | 227 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 229 |  |
| 229 | 228 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 170 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 19 | 173, 234 |  |
| 173 | 170 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 10 |  |  |
| 234 | 170 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 235 |  |
| 235 | 234 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 236 |  |
| 236 | 235 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 199 |  | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 1 |  |  |
| 220 |  | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 240 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 247 |  | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 1 |  |  |
