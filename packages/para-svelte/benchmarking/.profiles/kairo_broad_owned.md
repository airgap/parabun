# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482427570952 |
| endTime | 482432852850 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 119 | flushSync | 3 | 0.07% | 3954 | 86.07% |
| 2 | 130 | flush | 41 | 0.89% | 3349 | 72.90% |
| 3 | 131 | #process | 77 | 1.68% | 3307 | 71.99% |
| 4 | 132 | flush_queued_effects | 449 | 9.77% | 3075 | 66.94% |
| 5 | 133 | is_dirty | 157 | 3.42% | 1753 | 38.16% |
| 6 | 137 | update_effect | 233 | 5.07% | 871 | 18.96% |
| 7 | 148 | is_dirty | 171 | 3.72% | 823 | 17.91% |
| 8 | 134 | update_derived | 52 | 1.13% | 770 | 16.76% |
| 9 | 135 | execute_derived | 120 | 2.61% | 652 | 14.19% |
| 10 | 138 | update_reaction | 318 | 6.92% | 615 | 13.39% |
| 11 | 149 | update_derived | 58 | 1.26% | 591 | 12.86% |
| 12 | 127 | set | 5 | 0.11% | 584 | 12.71% |
| 13 | 128 | internal_set | 23 | 0.50% | 579 | 12.60% |
| 14 | 136 | update_reaction | 267 | 5.81% | 511 | 11.12% |
| 15 | 150 | execute_derived | 89 | 1.94% | 485 | 10.56% |
| 16 | 129 | mark_reactions | 138 | 3.00% | 484 | 10.54% |
| 17 | 57 | flushSync | 0 | 0.00% | 454 | 9.88% |
| 18 | 58 | flush | 6 | 0.13% | 395 | 8.60% |
| 19 | 59 | #process | 6 | 0.13% | 389 | 8.47% |
| 20 | 151 | update_reaction | 223 | 4.85% | 375 | 8.16% |
| 21 | 60 | flush_queued_effects | 40 | 0.87% | 367 | 7.99% |
| 22 | 144 | mark_reactions | 175 | 3.81% | 340 | 7.40% |
| 23 | 143 | get | 216 | 4.70% | 260 | 5.66% |
| 24 | 153 | get | 185 | 4.03% | 226 | 4.92% |
| 25 | 61 | is_dirty | 26 | 0.57% | 223 | 4.85% |

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
| 20 | 19 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 21, 43 |  |
| 21 | 20 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 22 |  |
| 22 | 21 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 24 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 25 |  |
| 25 | 24 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 26 |  |
| 26 | 25 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 27 |  |
| 27 | 26 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 29 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 30 |  |
| 30 | 29 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 31 |  |
| 31 | 30 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 32 |  |
| 32 | 31 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 43 | 20 | register_created_effect | packages/svelte/src/internal/client/reactivity/batch.js | 625 | 26 | 1 |  |  |
| 34 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 35 |  |
| 35 | 34 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 36 |  |
| 36 | 35 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 37, 50 |  |
| 37 | 36 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 38, 44 |  |
| 38 | 37 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 39, 46 |  |
| 39 | 38 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 40 |  |
| 40 | 39 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 41 |  |
| 41 | 40 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 42 |  |
| 42 | 41 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 46 | 38 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 47 |  |
| 47 | 46 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 48 |  |
| 48 | 47 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 51 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 44 | 37 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 45 |  |
| 45 | 44 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 50 | 36 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 57 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 58 |  |
| 58 | 57 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 6 | 59 |  |
| 59 | 58 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 6 | 60, 88, 106 |  |
| 60 | 59 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 40 | 61, 69, 94 |  |
| 61 | 60 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 26 | 62, 73 |  |
| 62 | 61 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 5 | 63, 81, 105 |  |
| 63 | 62 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 24 | 64, 90 |  |
| 64 | 63 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 35 | 109 |  |
| 83 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 28 | 89 |  |
| 89 | 83 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 |  |  |
| 109 | 64 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 90 | 63 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 81 | 62 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 3 |  |  |
| 105 | 62 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 | 111 |  |
| 111 | 105 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 73 | 61 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 13 | 74, 95 |  |
| 74 | 73 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 8 | 75, 79, 97 |  |
| 75 | 74 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 9 | 76, 102 |  |
| 76 | 75 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 21 | 107 |  |
| 78 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 19 |  |  |
| 107 | 76 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 102 | 75 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 4 |  |  |
| 79 | 74 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 | 80 |  |
| 80 | 79 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 97 | 74 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 3 |  |  |
| 95 | 73 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 8 |  |  |
| 69 | 60 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 25 | 70, 108 |  |
| 70 | 69 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 35 | 96, 99 |  |
| 72 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 27 | 101 |  |
| 101 | 72 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 96 | 70 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 6 |  |  |
| 99 | 70 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 2 |  |  |
| 108 | 69 | destroy_effect_children | packages/svelte/src/internal/client/reactivity/effects.js | 459 | 40 | 3 |  |  |
| 94 | 60 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 88 | 59 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 15 |  |  |
| 106 | 59 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 1 |  |  |
| 66 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 67 |  |
| 67 | 66 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 3 | 68, 91, 104 |  |
| 68 | 67 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 14 | 84 |  |
| 84 | 68 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 19 | 85, 103, 110 |  |
| 85 | 84 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 86, 98, 112 |  |
| 86 | 85 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 2 | 87 |  |
| 87 | 86 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 7 |  |  |
| 98 | 85 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 112 | 85 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 103 | 84 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 110 | 84 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 91 | 67 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 92 |  |
| 92 | 91 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 93 |  |
| 93 | 92 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 4 |  |  |
| 104 | 67 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 52 |  | (garbage collector) |  | 0 | 0 | 70 |  |  |
| 114 |  | (idle) |  | 0 | 0 | 92 |  |  |
| 119 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 3 | 130, 183 |  |
| 121 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 122 |  |
| 122 | 121 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 123, 166 |  |
| 123 | 122 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 124 |  |
| 124 | 123 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 125 |  |
| 125 | 124 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 2 |  |  |
| 166 | 122 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 167, 189 |  |
| 167 | 166 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 206 |  |
| 206 | 167 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 207 |  |
| 207 | 206 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 189 | 166 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 127 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 5 | 128 |  |
| 128 | 127 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 23 | 129, 140, 177, 184, 225 |  |
| 129 | 128 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 138 | 144, 172 |  |
| 144 | 129 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 175 | 145, 170, 185 |  |
| 145 | 144 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 87 | 146, 158, 199 |  |
| 146 | 145 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 3 | 147 |  |
| 147 | 146 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 38 |  |  |
| 158 | 145 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 12 |  |  |
| 199 | 145 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 6 |  |  |
| 170 | 144 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 11 |  |  |
| 185 | 144 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 8 |  |  |
| 172 | 129 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 6 |  |  |
| 140 | 128 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 3 | 141 |  |
| 141 | 140 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 142 |  |
| 142 | 141 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 53 |  |  |
| 177 | 128 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 14 |  |  |
| 184 | 128 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 225 | 128 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 130 | 119 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 41 | 131, 201 |  |
| 131 | 130 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 77 | 132, 162, 173, 187, 203, 215 |  |
| 132 | 131 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 449 | 133, 137, 221 |  |
| 133 | 132 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 157 | 134, 148, 205 |  |
| 134 | 133 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 52 | 135, 178, 180, 182, 211 |  |
| 135 | 134 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 120 | 136, 159, 161 |  |
| 136 | 135 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 267 | 163, 202, 224 |  |
| 153 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 185 | 164 |  |
| 164 | 153 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 41 |  |  |
| 188 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 |  |  |
| 163 | 136 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 9 |  |  |
| 202 | 136 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 224 | 136 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 159 | 135 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 16 |  |  |
| 161 | 135 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 5 |  |  |
| 178 | 134 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 22 | 179 |  |
| 179 | 178 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 15 |  |  |
| 180 | 134 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 5 |  |  |
| 182 | 134 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 23 |  |  |
| 211 | 134 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 148 | 133 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 171 | 149, 165 |  |
| 149 | 148 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 58 | 150, 160, 176, 209, 210 |  |
| 150 | 149 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 89 | 151, 175 |  |
| 151 | 150 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 223 | 154, 157, 223 |  |
| 154 | 151 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 156 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 138 |  |  |
| 157 | 151 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 12 |  |  |
| 223 | 151 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 175 | 150 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 21 |  |  |
| 160 | 149 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 18 |  |  |
| 176 | 149 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 14 | 198 |  |
| 198 | 176 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 14 |  |  |
| 209 | 149 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 210 | 149 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 165 | 148 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 61 |  |  |
| 205 | 133 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 137 | 132 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 233 | 138, 174, 181, 186 |  |
| 138 | 137 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 318 | 168, 222 |  |
| 143 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 216 | 169 |  |
| 169 | 143 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 44 |  |  |
| 204 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 168 | 138 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 34 |  |  |
| 222 | 138 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 174 | 137 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 5 |  |  |
| 181 | 137 | destroy_effect_children | packages/svelte/src/internal/client/reactivity/effects.js | 459 | 40 | 9 |  |  |
| 186 | 137 | execute_effect_teardown | packages/svelte/src/internal/client/reactivity/effects.js | 438 | 40 | 9 |  |  |
| 221 | 132 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 162 | 131 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 142 |  |  |
| 173 | 131 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 5 |  |  |
| 187 | 131 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 3 |  |  |
| 203 | 131 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 |  |  |
| 215 | 131 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 0 | 216 |  |
| 216 | 215 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 201 | 130 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 |  |  |
| 183 | 119 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 2 |  |  |
| 212 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 213 |  |
| 213 | 212 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 214 |  | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 1 |  |  |
| 196 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 208 |  | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
