# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482432858219 |
| endTime | 482438130998 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 107 | flushSync | 5 | 0.11% | 3912 | 86.22% |
| 2 | 108 | flush | 38 | 0.84% | 3305 | 72.85% |
| 3 | 109 | #process | 74 | 1.63% | 3267 | 72.01% |
| 4 | 110 | flush_queued_effects | 470 | 10.36% | 2999 | 66.10% |
| 5 | 111 | is_dirty | 176 | 3.88% | 1728 | 38.09% |
| 6 | 125 | update_effect | 209 | 4.61% | 794 | 17.50% |
| 7 | 116 | is_dirty | 162 | 3.57% | 777 | 17.13% |
| 8 | 112 | update_derived | 47 | 1.04% | 775 | 17.08% |
| 9 | 113 | execute_derived | 134 | 2.95% | 692 | 15.25% |
| 10 | 121 | set | 5 | 0.11% | 594 | 13.09% |
| 11 | 122 | internal_set | 22 | 0.48% | 588 | 12.96% |
| 12 | 126 | update_reaction | 315 | 6.94% | 559 | 12.32% |
| 13 | 117 | update_derived | 50 | 1.10% | 552 | 12.17% |
| 14 | 114 | update_reaction | 279 | 6.15% | 546 | 12.03% |
| 15 | 123 | mark_reactions | 116 | 2.56% | 508 | 11.20% |
| 16 | 118 | execute_derived | 97 | 2.14% | 451 | 9.94% |
| 17 | 51 | flushSync | 1 | 0.02% | 435 | 9.59% |
| 18 | 124 | mark_reactions | 168 | 3.70% | 378 | 8.33% |
| 19 | 52 | flush | 4 | 0.09% | 359 | 7.91% |
| 20 | 53 | #process | 8 | 0.18% | 355 | 7.82% |
| 21 | 119 | update_reaction | 200 | 4.41% | 332 | 7.32% |
| 22 | 55 | flush_queued_effects | 48 | 1.06% | 327 | 7.21% |
| 23 | 133 | get | 212 | 4.67% | 249 | 5.49% |
| 24 | 135 | get | 191 | 4.21% | 220 | 4.85% |
| 25 | 127 | mark_reactions | 130 | 2.87% | 195 | 4.30% |

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
| 29 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 34 |  |
| 31 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 32 |  |
| 32 | 31 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 33, 43 |  |
| 33 | 32 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 |  |  |
| 43 | 32 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 44 |  |
| 44 | 43 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 45 |  |
| 45 | 44 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 34 | 29 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 35 |  |
| 35 | 34 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 36 |  |
| 36 | 35 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 37, 41 |  |
| 37 | 36 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 38 |  |
| 38 | 37 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 40 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 41 | 36 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 42 |  |
| 42 | 41 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 51 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 1 | 52 |  |
| 52 | 51 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 4 | 53 |  |
| 53 | 52 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 8 | 54, 55, 99 |  |
| 54 | 53 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 19 |  |  |
| 55 | 53 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 48 | 56, 66 |  |
| 56 | 55 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 33 | 57 |  |
| 57 | 56 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 35 | 86, 98 |  |
| 65 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 25 | 85 |  |
| 85 | 65 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 86 | 57 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 2 |  |  |
| 98 | 57 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 66 | 55 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 9 | 67, 73 |  |
| 67 | 66 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 6 | 68, 87 |  |
| 68 | 67 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 14 | 69, 97 |  |
| 69 | 68 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 33 |  |  |
| 71 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 13 | 72 |  |
| 72 | 71 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 |  |  |
| 97 | 68 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 87 | 67 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 | 94 |  |
| 94 | 87 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 73 | 66 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 26 | 74, 81 |  |
| 74 | 73 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 4 | 75, 83, 96 |  |
| 75 | 74 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 8 | 76, 80 |  |
| 76 | 75 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 28 |  |  |
| 92 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 8 |  |  |
| 80 | 75 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 6 |  |  |
| 83 | 74 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 84 |  |
| 84 | 83 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 96 | 74 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 3 |  |  |
| 81 | 73 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 10 |  |  |
| 99 | 53 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 1 |  |  |
| 59 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 60 |  |
| 60 | 59 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 3 | 61, 88, 93 |  |
| 61 | 60 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 14 | 62, 100 |  |
| 62 | 61 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 20 | 63, 91 |  |
| 63 | 62 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 20 | 78 |  |
| 78 | 63 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 | 79 |  |
| 79 | 78 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 4 |  |  |
| 91 | 62 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 2 |  |  |
| 100 | 61 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 88 | 60 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 2 | 89 |  |
| 89 | 88 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 90 |  |
| 90 | 89 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 7 |  |  |
| 93 | 60 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 46 |  | (garbage collector) |  | 0 | 0 | 82 |  |  |
| 102 |  | (idle) |  | 0 | 0 | 95 |  |  |
| 107 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 5 | 108, 159 |  |
| 108 | 107 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 38 | 109 |  |
| 109 | 108 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 74 | 110, 138, 149, 150, 165, 179, 192 |  |
| 110 | 109 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 470 | 111, 125, 178 |  |
| 111 | 110 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 176 | 112, 116 |  |
| 112 | 111 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 47 | 113, 154, 173, 180 |  |
| 113 | 112 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 134 | 114, 139, 152 |  |
| 114 | 113 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 279 | 115, 191 |  |
| 115 | 114 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 14 |  |  |
| 133 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 212 | 158 |  |
| 158 | 133 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 37 |  |  |
| 189 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 191 | 114 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 139 | 113 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 11 |  |  |
| 152 | 113 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 154 | 112 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 16 | 155 |  |
| 155 | 154 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 8 |  |  |
| 173 | 112 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 11 |  |  |
| 180 | 112 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 116 | 111 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 162 | 117, 146 |  |
| 117 | 116 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 50 | 118, 140, 161, 190, 197 |  |
| 118 | 117 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 97 | 119, 148, 177 |  |
| 119 | 118 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 200 | 145, 195 |  |
| 137 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 124 |  |  |
| 145 | 119 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 7 |  |  |
| 195 | 119 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 148 | 118 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 21 |  |  |
| 177 | 118 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 140 | 117 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 20 | 185 |  |
| 185 | 140 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 6 |  |  |
| 161 | 117 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 23 |  |  |
| 190 | 117 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 197 | 117 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 146 | 116 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 63 |  |  |
| 125 | 110 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 209 | 126, 131, 163, 164 |  |
| 126 | 125 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 315 | 153, 176, 188 |  |
| 135 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 191 | 143 |  |
| 143 | 135 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 29 |  |  |
| 186 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 153 | 126 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 17 |  |  |
| 176 | 126 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 4 |  |  |
| 188 | 126 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 131 | 125 | destroy_effect_children | packages/svelte/src/internal/client/reactivity/effects.js | 459 | 40 | 10 |  |  |
| 163 | 125 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 7 |  |  |
| 164 | 125 | execute_effect_teardown | packages/svelte/src/internal/client/reactivity/effects.js | 438 | 40 | 9 |  |  |
| 178 | 110 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 138 | 109 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 175 |  |  |
| 149 | 109 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 4 |  |  |
| 150 | 109 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 9 |  |  |
| 165 | 109 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 2 |  |  |
| 179 | 109 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 192 | 109 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 121 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 5 | 122, 160 |  |
| 122 | 121 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 22 | 123, 128, 144, 175, 198 |  |
| 123 | 122 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 116 | 124, 162 |  |
| 124 | 123 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 168 | 127, 151, 181 |  |
| 127 | 124 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 130 | 141, 147, 174 |  |
| 141 | 127 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 12 | 142 |  |
| 142 | 141 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 38 |  |  |
| 147 | 127 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 10 |  |  |
| 174 | 127 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 5 |  |  |
| 151 | 124 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 12 |  |  |
| 181 | 124 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 162 | 123 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 14 |  |  |
| 128 | 122 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 2 | 129, 193 |  |
| 129 | 128 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 130 |  |
| 130 | 129 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 46 |  |  |
| 193 | 128 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 1 |  |  |
| 144 | 122 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 7 |  |  |
| 175 | 122 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 198 | 122 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 160 | 121 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 159 | 107 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 1 |  |  |
| 167 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 168 |  |
| 168 | 167 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 169 |  |
| 169 | 168 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 170 |  |
| 170 | 169 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 171 |  |
| 171 | 170 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 172, 183 |  |
| 172 | 171 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 183 | 171 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 184 |  |
| 184 | 183 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 2 |  |  |
| 187 |  | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 2 |  |  |
