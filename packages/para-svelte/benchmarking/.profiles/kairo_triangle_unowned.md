# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482461909198 |
| endTime | 482463610350 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 114 | flushSync | 7 | 0.49% | 1128 | 79.66% |
| 2 | 117 | flush | 31 | 2.19% | 771 | 54.45% |
| 3 | 118 | #process | 88 | 6.21% | 740 | 52.26% |
| 4 | 119 | flush_queued_effects | 22 | 1.55% | 634 | 44.77% |
| 5 | 120 | is_dirty | 8 | 0.56% | 561 | 39.62% |
| 6 | 121 | update_derived | 1 | 0.07% | 550 | 38.84% |
| 7 | 122 | execute_derived | 1 | 0.07% | 548 | 38.70% |
| 8 | 123 | update_reaction | 14 | 0.99% | 547 | 38.63% |
| 9 | 126 | get | 111 | 7.84% | 530 | 37.43% |
| 10 | 127 | update_derived | 15 | 1.06% | 383 | 27.05% |
| 11 | 116 | set | 19 | 1.34% | 346 | 24.44% |
| 12 | 128 | execute_derived | 53 | 3.74% | 345 | 24.36% |
| 13 | 136 | internal_set | 41 | 2.90% | 326 | 23.02% |
| 14 | 129 | update_reaction | 202 | 14.27% | 283 | 19.99% |
| 15 | 137 | ensure | 10 | 0.71% | 146 | 10.31% |
| 16 | 138 | Batch | 1 | 0.07% | 131 | 9.25% |
| 17 | 139 | Batch | 130 | 9.18% | 130 | 9.18% |
| 18 | 55 | flushSync | 1 | 0.07% | 125 | 8.83% |
| 19 | 141 | mark_reactions | 11 | 0.78% | 117 | 8.26% |
| 20 | 142 | mark_reactions | 11 | 0.78% | 106 | 7.49% |
| 21 | 143 | mark_reactions | 9 | 0.64% | 94 | 6.64% |
| 22 | 56 | flush | 3 | 0.21% | 94 | 6.64% |
| 23 | 57 | #process | 8 | 0.56% | 91 | 6.43% |
| 24 | 109 | (idle) | 82 | 5.79% | 82 | 5.79% |
| 25 | 144 | mark_reactions | 11 | 0.78% | 82 | 5.79% |

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
| 45 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 46 |  |
| 46 | 45 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 47 |  |
| 47 | 46 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 48 |  |
| 48 | 47 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 | 49 |  |
| 49 | 48 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 55 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 1 | 56 |  |
| 56 | 55 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 3 | 57 |  |
| 57 | 56 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 8 | 58, 88 |  |
| 58 | 57 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 1 | 59, 90 |  |
| 59 | 58 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 60 |  |
| 60 | 59 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 61, 85 |  |
| 61 | 60 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 62 |  |
| 62 | 61 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 | 98 |  |
| 65 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 13 | 66, 67 |  |
| 66 | 65 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 6 | 74, 104, 108 |  |
| 74 | 66 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 75, 95 |  |
| 75 | 74 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 18 |  |  |
| 77 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 12 | 99 |  |
| 99 | 77 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 95 | 74 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 104 | 66 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 108 | 66 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 67 | 65 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 97 |  |
| 97 | 67 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 103 |  | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 98 | 62 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 85 | 60 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 90 | 58 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 1 | 91 |  |
| 91 | 90 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 88 | 57 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 3 |  |  |
| 69 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 2 | 70 |  |
| 70 | 69 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 71, 78, 101 |  |
| 71 | 70 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 72 |  |
| 72 | 71 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 73 |  |
| 73 | 72 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 9 |  |  |
| 78 | 70 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 79 |  |
| 79 | 78 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 80 |  |
| 80 | 79 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 81, 89 |  |
| 81 | 80 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 82, 94 |  |
| 82 | 81 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 83 |  |
| 83 | 82 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 84 |  |
| 84 | 83 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 86 |  |
| 86 | 84 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 87 |  |
| 87 | 86 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 92 |  |
| 92 | 87 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 93, 105 |  |
| 93 | 92 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 105 | 92 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 106 |  |
| 106 | 105 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 107 |  |
| 107 | 106 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 94 | 81 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 89 | 80 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 101 | 70 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 50 |  | (garbage collector) |  | 0 | 0 | 64 |  |  |
| 109 |  | (idle) |  | 0 | 0 | 82 |  |  |
| 114 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 7 | 117, 195 |  |
| 116 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 19 | 136, 182 |  |
| 136 | 116 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 41 | 137, 141, 168, 169, 212 |  |
| 137 | 136 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 10 | 138, 148 |  |
| 138 | 137 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 1 | 139 |  |
| 139 | 138 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 130 |  |  |
| 148 | 137 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 5 |  |  |
| 141 | 136 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 11 | 142 |  |
| 142 | 141 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 11 | 143, 186 |  |
| 143 | 142 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 144, 165, 216 |  |
| 144 | 143 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 11 | 145, 160, 162 |  |
| 145 | 144 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 149, 180, 191 |  |
| 149 | 145 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 8 | 150 |  |
| 150 | 149 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 13 | 151 |  |
| 151 | 150 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 152, 215 |  |
| 152 | 151 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 153, 171 |  |
| 153 | 152 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 154 |  |
| 154 | 153 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 155, 210 |  |
| 155 | 154 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 | 156 |  |
| 156 | 155 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 3 |  |  |
| 210 | 154 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 171 | 152 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 215 | 151 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 180 | 145 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 191 | 145 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 160 | 144 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 162 | 144 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 165 | 143 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 216 | 143 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 186 | 142 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 168 | 136 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 169 | 136 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 18 |  |  |
| 212 | 136 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 182 | 116 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 117 | 114 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 31 | 118 |  |
| 118 | 117 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 88 | 119, 159, 167, 170, 178, 184 |  |
| 119 | 118 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 22 | 120, 131, 208 |  |
| 120 | 119 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 8 | 121, 183 |  |
| 121 | 120 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 122, 189 |  |
| 122 | 121 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 123 |  |
| 123 | 122 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 14 | 213 |  |
| 126 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 111 | 127, 140 |  |
| 127 | 126 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 15 | 128, 163, 166, 181, 197 |  |
| 128 | 127 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 53 | 129, 146, 192 |  |
| 129 | 128 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 202 | 187 |  |
| 158 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 56 | 161 |  |
| 161 | 158 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 16 |  |  |
| 193 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 187 | 129 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 6 |  |  |
| 146 | 128 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 7 |  |  |
| 192 | 128 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 2 |  |  |
| 163 | 127 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 7 | 179 |  |
| 179 | 163 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 7 |  |  |
| 166 | 127 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 6 |  |  |
| 181 | 127 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 2 |  |  |
| 197 | 127 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 140 | 126 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 25 | 157 |  |
| 157 | 140 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 11 |  |  |
| 211 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 213 | 123 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 189 | 121 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 190 |  |
| 190 | 189 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 183 | 120 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 131 | 119 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 14 | 132, 196 |  |
| 132 | 131 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 17 | 188 |  |
| 134 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 13 | 135 |  |
| 135 | 134 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 188 | 132 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 2 |  |  |
| 196 | 131 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 208 | 119 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 159 | 118 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 4 |  |  |
| 167 | 118 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 2 | 185 |  |
| 185 | 167 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 170 | 118 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 5 |  |  |
| 178 | 118 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 4 |  |  |
| 184 | 118 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 2 |  |  |
| 173 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 | 174 |  |
| 174 | 173 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 175 |  |
| 175 | 174 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 176 |  |
| 176 | 175 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 177 |  |
| 177 | 176 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 200 |  |
| 200 | 177 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 201 |  |
| 201 | 200 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 202 |  |
| 202 | 201 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 203 |  |
| 203 | 202 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 204 |  |
| 204 | 203 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 205 |  |
| 205 | 204 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 206 |  |
| 206 | 205 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 207 |  |
| 207 | 206 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 195 | 114 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 1 |  |  |
| 147 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 | 198 |  |
| 198 | 147 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
