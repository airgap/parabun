# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482447148986 |
| endTime | 482451984835 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 131 | flushSync | 13 | 0.31% | 3580 | 84.35% |
| 2 | 132 | flush | 134 | 3.16% | 2249 | 52.99% |
| 3 | 133 | #process | 312 | 7.35% | 2115 | 49.84% |
| 4 | 134 | flush_queued_effects | 93 | 2.19% | 1723 | 40.60% |
| 5 | 135 | is_dirty | 33 | 0.78% | 1401 | 33.01% |
| 6 | 145 | set | 57 | 1.34% | 1305 | 30.75% |
| 7 | 146 | internal_set | 132 | 3.11% | 1248 | 29.41% |
| 8 | 136 | update_derived | 15 | 0.35% | 1151 | 27.12% |
| 9 | 137 | execute_derived | 22 | 0.52% | 1123 | 26.46% |
| 10 | 138 | update_reaction | 79 | 1.86% | 1094 | 25.78% |
| 11 | 141 | get | 285 | 6.72% | 1008 | 23.75% |
| 12 | 142 | update_derived | 37 | 0.87% | 702 | 16.54% |
| 13 | 150 | ensure | 25 | 0.59% | 629 | 14.82% |
| 14 | 143 | execute_derived | 114 | 2.69% | 607 | 14.30% |
| 15 | 151 | Batch | 4 | 0.09% | 600 | 14.14% |
| 16 | 152 | Batch | 596 | 14.04% | 596 | 14.04% |
| 17 | 154 | update_reaction | 330 | 7.78% | 473 | 11.15% |
| 18 | 147 | mark_reactions | 157 | 3.70% | 403 | 9.50% |
| 19 | 55 | flushSync | 0 | 0.00% | 384 | 9.05% |
| 20 | 56 | flush | 11 | 0.26% | 264 | 6.22% |
| 21 | 57 | #process | 30 | 0.71% | 253 | 5.96% |
| 22 | 157 | mark_reactions | 151 | 3.56% | 235 | 5.54% |
| 23 | 153 | update_effect | 51 | 1.20% | 228 | 5.37% |
| 24 | 158 | is_dirty | 27 | 0.64% | 216 | 5.09% |
| 25 | 58 | flush_queued_effects | 13 | 0.31% | 209 | 4.92% |

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
| 19 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 20, 29 |  |
| 20 | 19 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 21 |  |
| 21 | 20 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 22 |  |
| 22 | 21 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 25 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 26 |  |
| 26 | 25 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 27 |  |
| 27 | 26 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 28 |  |
| 28 | 27 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 29 | 19 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 32 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 33 |  |
| 33 | 32 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 |  |  |
| 35 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 36 |  |
| 36 | 35 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 37 |  |
| 37 | 36 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 1 | 38 |  |
| 38 | 37 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 39 |  |
| 39 | 38 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 40 |  |
| 40 | 39 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 41 |  |
| 41 | 40 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 42 |  |
| 42 | 41 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 45 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 46, 49 |  |
| 46 | 45 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 47 |  |
| 47 | 46 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 48 |  |
| 48 | 47 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 49 | 45 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 55 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 56 |  |
| 56 | 55 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 11 | 57 |  |
| 57 | 56 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 30 | 58, 83, 84, 107, 119, 120 |  |
| 58 | 57 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 13 | 59, 86 |  |
| 59 | 58 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 60, 85 |  |
| 60 | 59 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 61, 101, 117 |  |
| 61 | 60 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 62, 110 |  |
| 62 | 61 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 12 | 121 |  |
| 65 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 34 | 66, 67 |  |
| 66 | 65 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 |  |  |
| 67 | 65 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 4 | 68, 88, 105, 123 |  |
| 68 | 67 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 19 | 69, 104 |  |
| 69 | 68 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 41 |  |  |
| 89 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 16 |  |  |
| 104 | 68 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 3 |  |  |
| 88 | 67 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 5 |  |  |
| 105 | 67 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 106 |  |
| 106 | 105 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 123 | 67 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 121 | 62 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 110 | 61 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 101 | 60 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 102 |  |
| 102 | 101 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 117 | 60 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 85 | 59 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 90 |  |
| 90 | 85 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 91, 93 |  |
| 91 | 90 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 92 |  |
| 92 | 91 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 93 | 90 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 94, 100 |  |
| 94 | 93 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 9 | 115 |  |
| 122 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 115 | 94 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 2 |  |  |
| 100 | 93 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 86 | 58 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 3 | 87 |  |
| 87 | 86 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 12 | 125 |  |
| 96 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 8 | 111 |  |
| 111 | 96 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 125 | 87 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 83 | 57 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 2 |  |  |
| 84 | 57 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 7 |  |  |
| 107 | 57 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 | 108 |  |
| 108 | 107 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 119 | 57 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 1 |  |  |
| 120 | 57 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 2 |  |  |
| 72 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 5 | 73 |  |
| 73 | 72 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 14 | 74, 79, 80 |  |
| 74 | 73 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 19 | 75, 97 |  |
| 75 | 74 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 10 | 76, 116 |  |
| 76 | 75 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 77, 124 |  |
| 77 | 76 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 78 |  |
| 78 | 77 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 124 | 76 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 116 | 75 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 97 | 74 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 79 | 73 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 10 | 118 |  |
| 118 | 79 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 80 | 73 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 2 | 81 |  |
| 81 | 80 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 82 |  |
| 82 | 81 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 51 |  |  |
| 113 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 114 |  |
| 114 | 113 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 50 |  | (garbage collector) |  | 0 | 0 | 162 |  |  |
| 98 |  | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 |  |  |
| 103 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 |  |  |
| 126 |  | (idle) |  | 0 | 0 | 71 |  |  |
| 131 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 13 | 132, 189, 207 |  |
| 132 | 131 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 134 | 133 |  |
| 133 | 132 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 312 | 134, 164, 177, 190, 195, 201, 208, 245 |  |
| 134 | 133 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 93 | 135, 153, 238 |  |
| 135 | 134 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 33 | 136, 158, 244 |  |
| 136 | 135 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 15 | 137, 196, 198 |  |
| 137 | 136 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 22 | 138, 172 |  |
| 138 | 137 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 79 | 228, 239 |  |
| 141 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 285 | 142, 180 |  |
| 142 | 141 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 37 | 143, 165, 187, 220, 233 |  |
| 143 | 142 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 114 | 154, 182, 237 |  |
| 154 | 143 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 330 | 188 |  |
| 156 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 135 |  |  |
| 188 | 154 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 8 |  |  |
| 182 | 143 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 18 |  |  |
| 237 | 143 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 2 |  |  |
| 165 | 142 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 19 | 173 |  |
| 173 | 165 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 15 |  |  |
| 187 | 142 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 20 |  |  |
| 220 | 142 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 3 |  |  |
| 233 | 142 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 180 | 141 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 21 |  |  |
| 246 |  | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 228 | 138 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 |  |  |
| 239 | 138 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 172 | 137 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 7 |  |  |
| 196 | 136 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 | 197 |  |
| 197 | 196 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 4 |  |  |
| 198 | 136 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 8 |  |  |
| 158 | 135 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 27 | 159, 174 |  |
| 159 | 158 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 18 | 160, 206, 216 |  |
| 160 | 159 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 21 | 161, 185, 232 |  |
| 161 | 160 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 77 | 171 |  |
| 163 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 40 |  |  |
| 171 | 161 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 5 |  |  |
| 185 | 160 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 8 |  |  |
| 232 | 160 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 206 | 159 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 5 | 235 |  |
| 235 | 206 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 216 | 159 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 5 |  |  |
| 174 | 158 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 |  |  |
| 244 | 135 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 153 | 134 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 51 | 166, 200, 219 |  |
| 166 | 153 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 100 | 221, 222 |  |
| 168 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 54 | 191, 199 |  |
| 191 | 168 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 192 |  |
| 192 | 191 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 193 |  |
| 193 | 192 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 199 | 168 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 9 |  |  |
| 223 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 221 | 166 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 222 | 166 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 3 |  |  |
| 200 | 153 | execute_effect_teardown | packages/svelte/src/internal/client/reactivity/effects.js | 438 | 40 | 3 |  |  |
| 219 | 153 | destroy_effect_children | packages/svelte/src/internal/client/reactivity/effects.js | 459 | 40 | 1 |  |  |
| 238 | 134 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 164 | 133 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 20 |  |  |
| 177 | 133 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 36 |  |  |
| 190 | 133 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 3 |  |  |
| 195 | 133 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 10 |  |  |
| 201 | 133 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 | 202 |  |
| 202 | 201 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 6 |  |  |
| 208 | 133 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 3 |  |  |
| 245 | 133 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 145 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 57 | 146 |  |
| 146 | 145 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 132 | 147, 149, 150, 183, 217, 236 |  |
| 147 | 146 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 157 | 148, 157, 176, 213 |  |
| 148 | 147 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 6 |  |  |
| 157 | 147 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 151 | 169, 175, 203, 205 |  |
| 169 | 157 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 12 |  |  |
| 175 | 157 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 27 | 178, 194, 234 |  |
| 178 | 175 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 2 | 179 |  |
| 179 | 178 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 28 |  |  |
| 194 | 175 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 5 |  |  |
| 234 | 175 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 2 |  |  |
| 203 | 157 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 204 |  |
| 204 | 203 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 205 | 157 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 7 |  |  |
| 176 | 147 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 4 |  |  |
| 213 | 147 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 214 |  |
| 214 | 213 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 149 | 146 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 78 | 224 |  |
| 224 | 149 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 2 |  |  |
| 150 | 146 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 25 | 151, 215 |  |
| 151 | 150 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 4 | 152 |  |
| 152 | 151 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 596 |  |  |
| 215 | 150 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 4 |  |  |
| 183 | 146 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 217 | 146 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 236 | 146 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 189 | 131 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 9 |  |  |
| 207 | 131 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 |  |  |
| 210 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 211 |  |
| 211 | 210 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 212, 229 |  |
| 212 | 211 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 229 | 211 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 230 |  |
| 230 | 229 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 231 |  |
| 231 | 230 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 170 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 181 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 9 | 186 |  |
| 186 | 181 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 |  |  |
| 225 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 226 |  | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
