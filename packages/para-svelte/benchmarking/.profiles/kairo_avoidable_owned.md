# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482415054332 |
| endTime | 482421186344 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 191 | flushSync | 23 | 0.42% | 4579 | 82.85% |
| 2 | 196 | flush | 274 | 4.96% | 2341 | 42.36% |
| 3 | 193 | set | 124 | 2.24% | 2201 | 39.82% |
| 4 | 194 | internal_set | 230 | 4.16% | 2077 | 37.58% |
| 5 | 197 | #process | 613 | 11.09% | 2066 | 37.38% |
| 6 | 198 | flush_queued_effects | 48 | 0.87% | 1219 | 22.06% |
| 7 | 199 | is_dirty | 62 | 1.12% | 1171 | 21.19% |
| 8 | 195 | ensure | 38 | 0.69% | 1136 | 20.55% |
| 9 | 208 | Batch | 3 | 0.05% | 1093 | 19.78% |
| 10 | 200 | is_dirty | 66 | 1.19% | 1092 | 19.76% |
| 11 | 209 | Batch | 1090 | 19.72% | 1090 | 19.72% |
| 12 | 201 | is_dirty | 78 | 1.41% | 1016 | 18.38% |
| 13 | 202 | is_dirty | 57 | 1.03% | 926 | 16.75% |
| 14 | 213 | mark_reactions | 84 | 1.52% | 543 | 9.82% |
| 15 | 114 | flushSync | 2 | 0.04% | 524 | 9.48% |
| 16 | 203 | is_dirty | 79 | 1.43% | 469 | 8.49% |
| 17 | 214 | mark_reactions | 69 | 1.25% | 452 | 8.18% |
| 18 | 210 | update_derived | 12 | 0.22% | 390 | 7.06% |
| 19 | 215 | mark_reactions | 65 | 1.18% | 382 | 6.91% |
| 20 | 204 | update_derived | 17 | 0.31% | 377 | 6.82% |
| 21 | 211 | execute_derived | 63 | 1.14% | 360 | 6.51% |
| 22 | 205 | execute_derived | 62 | 1.12% | 333 | 6.02% |
| 23 | 216 | mark_reactions | 79 | 1.43% | 312 | 5.65% |
| 24 | 127 | flush | 46 | 0.83% | 292 | 5.28% |
| 25 | 219 | update_reaction | 162 | 2.93% | 289 | 5.23% |

## Nodes
| ID | Parent ID | Function | URL | Line | Column | Hit count | Children | Deopt reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 9 |  |
| 9 | 8 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 10 |  |
| 10 | 9 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 11 |  |
| 11 | 10 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 14 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 15, 92 |  |
| 15 | 14 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 3 | 23 |  |
| 23 | 15 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 2 | 99, 101 |  |
| 99 | 23 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 3 |  |  |
| 101 | 23 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 102 |  |
| 102 | 101 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 103 |  |
| 103 | 102 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 104 |  |
| 104 | 103 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 105 |  |
| 105 | 104 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 106 |  |
| 106 | 105 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 107 |  |
| 107 | 106 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 108 |  |
| 108 | 107 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 109 |  |
| 109 | 108 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 17 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 18 |  |
| 18 | 17 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 19, 93 |  |
| 19 | 18 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 20 |  |
| 20 | 19 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 21 |  |
| 21 | 20 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 2 |  |  |
| 93 | 18 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 94 |  |
| 94 | 93 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 95 |  |
| 95 | 94 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 96 |  |
| 96 | 95 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 97 |  |
| 97 | 96 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 98 |  |
| 98 | 97 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 92 | 14 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 0 |  |  |
| 24 |  | (anonymous) | packages/svelte/src/internal/client/reactivity/effects.js | 264 | 9 | 0 | 25 |  |
| 25 | 24 | destroy_effect | packages/svelte/src/internal/client/reactivity/effects.js | 506 | 31 | 0 | 26 |  |
| 26 | 25 | destroy_effect_children | packages/svelte/src/internal/client/reactivity/effects.js | 459 | 40 | 0 | 27 |  |
| 27 | 26 | destroy_effect | packages/svelte/src/internal/client/reactivity/effects.js | 506 | 31 | 1 | 28 |  |
| 28 | 27 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 0 | 29 |  |
| 29 | 28 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 0 | 30 |  |
| 30 | 29 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 |  |  |
| 32 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 33, 34 |  |
| 33 | 32 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 |  |  |
| 34 | 32 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 35 |  |
| 35 | 34 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 36 |  |
| 36 | 35 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 38 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 39 |  |
| 39 | 38 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 40, 100 |  |
| 40 | 39 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 41 |  |
| 41 | 40 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 43 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 44 |  |
| 44 | 43 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 45, 66 |  |
| 45 | 44 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 46 |  |
| 46 | 45 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 48 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 49 |  |
| 49 | 48 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 50 |  |
| 50 | 49 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 51 |  |
| 51 | 50 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 53 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 54 |  |
| 54 | 53 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 55 |  |
| 55 | 54 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 56 |  |
| 56 | 55 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 58 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 59 |  |
| 59 | 58 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 60 |  |
| 60 | 59 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 61 |  |
| 61 | 60 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 63 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 64 |  |
| 64 | 63 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 65 |  |
| 65 | 64 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 |  |  |
| 66 | 44 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 67 |  |
| 67 | 66 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 68 |  |
| 68 | 67 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 70 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 71 |  |
| 71 | 70 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 72 |  |
| 72 | 71 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 73 |  |
| 73 | 72 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 74 |  |
| 74 | 73 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 76 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 77 |  |
| 77 | 76 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 78 |  |
| 78 | 77 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 79 |  |
| 79 | 78 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 80 |  |
| 80 | 79 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 82 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 83 |  |
| 83 | 82 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 84 |  |
| 84 | 83 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 85 |  |
| 85 | 84 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 86 |  |
| 86 | 85 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 88 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 89 |  |
| 89 | 88 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 90 |  |
| 90 | 89 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 0 | 91 |  |
| 91 | 90 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 0 |  |  |
| 100 | 39 | register_created_effect | packages/svelte/src/internal/client/reactivity/batch.js | 625 | 26 | 1 |  |  |
| 114 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 2 | 127 |  |
| 116 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 | 117 |  |
| 117 | 116 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 118 |  |
| 118 | 117 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 |  |  |
| 120 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 14 | 121 |  |
| 121 | 120 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 22 | 122, 125, 126, 138, 165 |  |
| 122 | 121 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 7 | 123 |  |
| 123 | 122 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 124 |  |
| 124 | 123 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 99 |  |  |
| 125 | 121 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 126 | 121 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 18 | 184 |  |
| 184 | 126 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 138 | 121 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 8 | 139, 156 |  |
| 139 | 138 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 10 | 140, 170 |  |
| 140 | 139 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 141, 178 |  |
| 141 | 140 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 12 | 142 |  |
| 142 | 141 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 13 | 143 |  |
| 143 | 142 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 144 |  |
| 144 | 143 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 | 145 |  |
| 145 | 144 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 8 |  |  |
| 178 | 140 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 170 | 139 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 156 | 138 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 165 | 121 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 2 |  |  |
| 127 | 114 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 46 | 128 |  |
| 128 | 127 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 65 | 129, 137, 160, 171, 172, 177 |  |
| 129 | 128 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 5 | 130 |  |
| 130 | 129 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 9 | 131, 182 |  |
| 131 | 130 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 132, 157, 162 |  |
| 132 | 131 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 133, 181 |  |
| 133 | 132 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 11 | 134, 146, 173 |  |
| 134 | 133 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 135, 179, 183 |  |
| 135 | 134 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 136 |  |
| 136 | 135 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 24 | 175, 180 |  |
| 155 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 14 | 169 |  |
| 169 | 155 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 175 | 136 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 3 |  |  |
| 180 | 136 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 179 | 134 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 183 | 134 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 146 | 133 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 147, 174 |  |
| 147 | 146 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 148, 152, 159 |  |
| 148 | 147 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 9 | 149, 166 |  |
| 149 | 148 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 22 |  |  |
| 168 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 8 |  |  |
| 166 | 148 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 152 | 147 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 3 | 176 |  |
| 176 | 152 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 159 | 147 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 174 | 146 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 173 | 133 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 181 | 132 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 157 | 131 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 162 | 131 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 163 |  |
| 163 | 162 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 164 |  |
| 164 | 163 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 182 | 130 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 137 | 128 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 17 |  |  |
| 160 | 128 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 0 | 161 |  |
| 161 | 160 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 5 |  |  |
| 171 | 128 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 6 |  |  |
| 172 | 128 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 5 |  |  |
| 177 | 128 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 151 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 153 |  |
| 153 | 151 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 22 |  | (garbage collector) |  | 0 | 0 | 259 |  |  |
| 158 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 186 |  | (idle) |  | 0 | 0 | 69 |  |  |
| 191 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 23 | 196, 230 |  |
| 193 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 124 | 194 |  |
| 194 | 193 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 230 | 195, 213, 220, 255, 291 |  |
| 195 | 194 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 38 | 208, 265 |  |
| 208 | 195 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 3 | 209 |  |
| 209 | 208 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1090 |  |  |
| 265 | 195 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 5 |  |  |
| 213 | 194 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 84 | 214, 244, 285 |  |
| 214 | 213 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 69 | 215, 256 |  |
| 215 | 214 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 65 | 216, 252, 275 |  |
| 216 | 215 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 79 | 217, 251, 264 |  |
| 217 | 216 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 103 | 218, 231, 272 |  |
| 218 | 217 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 8 |  |  |
| 231 | 217 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 34 | 232, 236, 283 |  |
| 232 | 231 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 2 | 233 |  |
| 233 | 232 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 71 |  |  |
| 236 | 231 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 7 |  |  |
| 283 | 231 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 272 | 217 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 251 | 216 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 264 | 216 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 252 | 215 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 4 |  |  |
| 275 | 215 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 256 | 214 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 244 | 213 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 6 |  |  |
| 285 | 213 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 220 | 194 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 157 | 282 |  |
| 282 | 220 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 255 | 194 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 9 |  |  |
| 291 | 194 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 196 | 191 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 274 | 197, 292 |  |
| 197 | 196 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 613 | 198, 207, 212, 234, 238, 247, 266, 284 |  |
| 198 | 197 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 48 | 199 |  |
| 199 | 198 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 62 | 200, 241 |  |
| 200 | 199 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 66 | 201, 263 |  |
| 201 | 200 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 78 | 202, 250, 287 |  |
| 202 | 201 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 57 | 203, 210, 228 |  |
| 203 | 202 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 79 | 204, 235 |  |
| 204 | 203 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 17 | 205, 224, 237, 249 |  |
| 205 | 204 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 62 | 206, 227, 254 |  |
| 206 | 205 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 173 | 267, 286 |  |
| 240 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 67 |  |  |
| 267 | 206 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 7 |  |  |
| 286 | 206 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 227 | 205 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 22 |  |  |
| 254 | 205 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 224 | 204 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 5 | 225 |  |
| 225 | 224 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 11 |  |  |
| 237 | 204 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 10 |  |  |
| 249 | 204 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 235 | 203 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 13 |  |  |
| 210 | 202 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 12 | 211, 243 |  |
| 211 | 210 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 63 | 219, 245, 276 |  |
| 219 | 211 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 162 | 269, 270 |  |
| 222 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 103 | 242 |  |
| 242 | 222 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 18 |  |  |
| 268 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 269 | 219 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 270 | 219 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 4 |  |  |
| 245 | 211 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 7 |  |  |
| 276 | 211 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 243 | 210 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 11 | 246 |  |
| 246 | 243 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 7 |  |  |
| 228 | 202 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 10 |  |  |
| 250 | 201 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 11 |  |  |
| 287 | 201 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 263 | 200 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 10 |  |  |
| 241 | 199 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 17 |  |  |
| 207 | 197 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 146 |  |  |
| 212 | 197 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 39 |  |  |
| 234 | 197 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 24 |  |  |
| 238 | 197 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 8 |  |  |
| 247 | 197 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 | 253 |  |
| 253 | 247 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 12 |  |  |
| 266 | 197 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 3 |  |  |
| 284 | 197 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 292 | 196 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 |  |  |
| 230 | 191 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 12 |  |  |
| 280 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 281 |  |
| 281 | 280 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 288 |  |
| 288 | 281 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 289 |  |
| 289 | 288 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 290 |  |
| 290 | 289 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 223 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 34 | 229 |  |
| 229 | 223 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 22 |  |  |
| 277 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 271 |  | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 1 |  |  |
| 278 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 273 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
