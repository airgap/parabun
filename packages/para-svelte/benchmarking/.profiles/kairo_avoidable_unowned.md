# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482421197255 |
| endTime | 482427562228 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 143 | flushSync | 33 | 0.57% | 4866 | 84.54% |
| 2 | 156 | set | 94 | 1.63% | 2544 | 44.20% |
| 3 | 157 | internal_set | 229 | 3.98% | 2450 | 42.56% |
| 4 | 144 | flush | 290 | 5.04% | 2265 | 39.35% |
| 5 | 145 | #process | 658 | 11.43% | 1975 | 34.31% |
| 6 | 163 | ensure | 26 | 0.45% | 1582 | 27.48% |
| 7 | 164 | Batch | 5 | 0.09% | 1544 | 26.82% |
| 8 | 165 | Batch | 1539 | 26.74% | 1539 | 26.74% |
| 9 | 146 | flush_queued_effects | 52 | 0.90% | 1167 | 20.27% |
| 10 | 147 | is_dirty | 46 | 0.80% | 1115 | 19.37% |
| 11 | 148 | is_dirty | 64 | 1.11% | 1051 | 18.26% |
| 12 | 149 | is_dirty | 60 | 1.04% | 977 | 16.97% |
| 13 | 150 | is_dirty | 92 | 1.60% | 909 | 15.79% |
| 14 | 158 | mark_reactions | 67 | 1.16% | 526 | 9.14% |
| 15 | 76 | flushSync | 3 | 0.05% | 484 | 8.41% |
| 16 | 159 | mark_reactions | 79 | 1.37% | 450 | 7.82% |
| 17 | 151 | is_dirty | 62 | 1.08% | 426 | 7.40% |
| 18 | 176 | update_derived | 18 | 0.31% | 377 | 6.55% |
| 19 | 160 | mark_reactions | 70 | 1.22% | 367 | 6.38% |
| 20 | 152 | update_derived | 29 | 0.50% | 355 | 6.17% |
| 21 | 177 | execute_derived | 47 | 0.82% | 341 | 5.92% |
| 22 | 161 | mark_reactions | 72 | 1.25% | 294 | 5.11% |
| 23 | 153 | execute_derived | 50 | 0.87% | 293 | 5.09% |
| 24 | 178 | update_reaction | 152 | 2.64% | 280 | 4.86% |
| 25 | 71 | (garbage collector) | 262 | 4.55% | 262 | 4.55% |

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
| 19 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 20 |  |
| 20 | 19 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 21 |  |
| 21 | 20 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 22 |  |
| 22 | 21 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 24 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 25 |  |
| 25 | 24 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 26 |  |
| 26 | 25 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 27 |  |
| 27 | 26 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 29 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 30 |  |
| 30 | 29 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 31 |  |
| 31 | 30 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 32 |  |
| 32 | 31 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 34 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 35 |  |
| 35 | 34 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 36 |  |
| 36 | 35 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 37 |  |
| 37 | 36 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 39 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 40 |  |
| 40 | 39 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 41 |  |
| 41 | 40 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 42 |  |
| 42 | 41 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 44 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 52 |  |
| 46 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 | 47, 51 |  |
| 47 | 46 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 48, 63, 64 |  |
| 48 | 47 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 49 |  |
| 49 | 48 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 50 |  |
| 50 | 49 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 2 |  |  |
| 63 | 47 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 64 | 47 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 65 |  |
| 65 | 64 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 66 |  |
| 66 | 65 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 67 |  |
| 67 | 66 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 68 |  |
| 68 | 67 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 69 |  |
| 69 | 68 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 70 |  |
| 70 | 69 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 51 | 46 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 52 | 44 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 53 |  |
| 53 | 52 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 54 |  |
| 54 | 53 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 55 |  |
| 55 | 54 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 56 |  |
| 56 | 55 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 57 |  |
| 57 | 56 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 58 |  |
| 58 | 57 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 59 |  |
| 59 | 58 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 60 |  |
| 60 | 59 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 61 |  |
| 61 | 60 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 62 |  |
| 62 | 61 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 76 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 3 | 86, 117 |  |
| 78 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 18 | 79 |  |
| 79 | 78 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 31 | 80, 83, 120, 128 |  |
| 80 | 79 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 2 | 81, 110 |  |
| 81 | 80 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 82 |  |
| 82 | 81 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 120 |  |  |
| 110 | 80 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 2 |  |  |
| 83 | 79 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 84, 136 |  |
| 84 | 83 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 7 | 85, 129 |  |
| 85 | 84 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 8 | 102 |  |
| 102 | 85 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 8 | 103, 123 |  |
| 103 | 102 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 15 | 104 |  |
| 104 | 103 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 105, 127 |  |
| 105 | 104 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 2 | 106 |  |
| 106 | 105 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 7 |  |  |
| 127 | 104 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 123 | 102 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 129 | 84 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 136 | 83 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 120 | 79 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 8 |  |  |
| 128 | 79 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 86 | 76 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 22 | 87 |  |
| 87 | 86 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 69 | 88, 107, 114, 115, 132, 135 |  |
| 88 | 87 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 7 | 89 |  |
| 89 | 88 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 90, 137 |  |
| 90 | 89 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 91, 111 |  |
| 91 | 90 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 92, 130 |  |
| 92 | 91 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 93, 97 |  |
| 93 | 92 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 12 | 94 |  |
| 94 | 93 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 95, 118 |  |
| 95 | 94 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 96, 126 |  |
| 96 | 95 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 20 | 108 |  |
| 108 | 96 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 113 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 9 |  |  |
| 126 | 95 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 3 |  |  |
| 118 | 94 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 | 119 |  |
| 119 | 118 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 97 | 92 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 98, 121 |  |
| 98 | 97 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 8 | 99, 122 |  |
| 99 | 98 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 18 | 116 |  |
| 101 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 13 |  |  |
| 116 | 99 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 122 | 98 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 121 | 97 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 | 131 |  |
| 131 | 121 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 130 | 91 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 111 | 90 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 137 | 89 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 107 | 87 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 1 |  |  |
| 114 | 87 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 8 |  |  |
| 115 | 87 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 3 |  |  |
| 132 | 87 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 0 | 133 |  |
| 133 | 132 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 135 | 87 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 117 | 76 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 2 |  |  |
| 124 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 125 |  |
| 125 | 124 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 71 |  | (garbage collector) |  | 0 | 0 | 262 |  |  |
| 138 |  | (idle) |  | 0 | 0 | 69 |  |  |
| 143 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 33 | 144, 175, 198 |  |
| 144 | 143 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 290 | 145 |  |
| 145 | 144 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 658 | 146, 166, 182, 183, 189, 201, 204 |  |
| 146 | 145 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 52 | 147 |  |
| 147 | 146 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 46 | 148, 195 |  |
| 148 | 147 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 64 | 149, 167 |  |
| 149 | 148 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 60 | 150, 188 |  |
| 150 | 149 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 92 | 151, 176, 181, 233 |  |
| 151 | 150 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 62 | 152, 187 |  |
| 152 | 151 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 29 | 153, 196, 205, 216 |  |
| 153 | 152 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 50 | 154, 186, 213 |  |
| 154 | 153 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 140 | 184, 190 |  |
| 174 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 76 |  |  |
| 184 | 154 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 5 |  |  |
| 190 | 154 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 186 | 153 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 17 |  |  |
| 213 | 153 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 2 |  |  |
| 196 | 152 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 8 | 197 |  |
| 197 | 196 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 13 |  |  |
| 205 | 152 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 11 |  |  |
| 216 | 152 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 187 | 151 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 9 |  |  |
| 176 | 150 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 18 | 177, 209 |  |
| 177 | 176 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 47 | 178, 215 |  |
| 178 | 177 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 152 | 217, 222 |  |
| 180 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 114 | 207 |  |
| 207 | 180 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 10 |  |  |
| 235 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 217 | 178 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 2 |  |  |
| 222 | 178 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 215 | 177 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 14 |  |  |
| 209 | 176 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 7 | 210 |  |
| 210 | 209 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 11 |  |  |
| 181 | 150 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 12 |  |  |
| 233 | 150 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 188 | 149 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 8 |  |  |
| 167 | 148 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 10 |  |  |
| 195 | 147 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 18 |  |  |
| 166 | 145 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 20 |  |  |
| 182 | 145 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 25 |  |  |
| 183 | 145 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 82 |  |  |
| 189 | 145 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 3 | 192 |  |
| 192 | 189 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 9 |  |  |
| 201 | 145 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 8 |  |  |
| 204 | 145 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 3 |  |  |
| 156 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 94 | 157 |  |
| 157 | 156 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 229 | 158, 163, 168, 185, 218, 236 |  |
| 158 | 157 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 67 | 159, 203, 232 |  |
| 159 | 158 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 79 | 160, 223 |  |
| 160 | 159 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 70 | 161, 199, 225 |  |
| 161 | 160 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 72 | 162, 221, 234 |  |
| 162 | 161 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 105 | 169, 194, 211 |  |
| 169 | 162 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 42 | 170, 214, 219 |  |
| 170 | 169 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 8 | 171 |  |
| 171 | 170 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 51 |  |  |
| 214 | 169 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 5 |  |  |
| 219 | 169 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 2 |  |  |
| 194 | 162 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 211 | 162 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 4 |  |  |
| 221 | 161 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 234 | 161 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 199 | 160 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 225 | 160 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 223 | 159 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 4 |  |  |
| 203 | 158 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 6 |  |  |
| 232 | 158 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 163 | 157 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 26 | 164, 202 |  |
| 164 | 163 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 5 | 165 |  |
| 165 | 164 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1539 |  |  |
| 202 | 163 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 12 |  |  |
| 168 | 157 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 104 | 240 |  |
| 240 | 168 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 185 | 157 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 6 |  |  |
| 218 | 157 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 236 | 157 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 175 | 143 | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 |  |  |
| 198 | 143 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 21 |  |  |
| 227 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 | 228 |  |
| 228 | 227 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 229 |  |
| 229 | 228 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 230 |  |
| 230 | 229 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 231 |  |
| 231 | 230 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 172 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 29 | 193 |  |
| 193 | 172 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 13 |  |  |
| 206 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 208 |  | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 2 |  |  |
| 220 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 191 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 224 |  | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 1 |  |  |
| 238 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
