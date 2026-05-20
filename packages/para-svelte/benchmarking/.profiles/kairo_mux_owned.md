# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482451989706 |
| endTime | 482455055096 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 129 | flushSync | 3 | 0.14% | 1711 | 82.14% |
| 2 | 137 | flush | 14 | 0.67% | 1269 | 60.92% |
| 3 | 138 | #process | 20 | 0.96% | 1254 | 60.20% |
| 4 | 139 | flush_queued_effects | 76 | 3.65% | 1137 | 54.58% |
| 5 | 140 | is_dirty | 109 | 5.23% | 1054 | 50.60% |
| 6 | 141 | is_dirty | 123 | 5.90% | 910 | 43.69% |
| 7 | 142 | update_derived | 38 | 1.82% | 545 | 26.16% |
| 8 | 143 | execute_derived | 76 | 3.65% | 496 | 23.81% |
| 9 | 144 | update_reaction | 201 | 9.65% | 407 | 19.54% |
| 10 | 145 | is_dirty | 83 | 3.98% | 232 | 11.14% |
| 11 | 154 | set | 5 | 0.24% | 224 | 10.75% |
| 12 | 155 | internal_set | 9 | 0.43% | 219 | 10.51% |
| 13 | 131 | set | 1 | 0.05% | 214 | 10.27% |
| 14 | 132 | internal_set | 6 | 0.29% | 213 | 10.23% |
| 15 | 156 | mark_reactions | 3 | 0.14% | 199 | 9.55% |
| 16 | 66 | flushSync | 0 | 0.00% | 197 | 9.46% |
| 17 | 157 | mark_reactions | 34 | 1.63% | 196 | 9.41% |
| 18 | 165 | get | 161 | 7.73% | 191 | 9.17% |
| 19 | 133 | mark_reactions | 2 | 0.10% | 183 | 8.79% |
| 20 | 134 | mark_reactions | 50 | 2.40% | 181 | 8.69% |
| 21 | 158 | mark_reactions | 77 | 3.70% | 158 | 7.59% |
| 22 | 67 | flush | 2 | 0.10% | 158 | 7.59% |
| 23 | 68 | #process | 0 | 0.00% | 156 | 7.49% |
| 24 | 69 | flush_queued_effects | 14 | 0.67% | 142 | 6.82% |
| 25 | 135 | mark_reactions | 63 | 3.02% | 126 | 6.05% |

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
| 20 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 21 |  |
| 21 | 20 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 22 |  |
| 22 | 21 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 23 |  |
| 23 | 22 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 25 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 26, 39 |  |
| 26 | 25 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 27 |  |
| 27 | 26 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 28 |  |
| 28 | 27 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 30 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 31 |  |
| 31 | 30 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 32 |  |
| 32 | 31 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 33 |  |
| 33 | 32 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 35 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 36 |  |
| 36 | 35 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 37 |  |
| 37 | 36 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 38 |  |
| 38 | 37 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 39 | 25 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 41 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 42 |  |
| 42 | 41 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 44 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 45 |  |
| 45 | 44 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 46 |  |
| 46 | 45 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 47 |  |
| 47 | 46 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 48 |  |
| 48 | 47 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 49 |  |
| 49 | 48 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 50, 52 |  |
| 50 | 49 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 51 |  |
| 51 | 50 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 58 |  |
| 58 | 51 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 52 | 49 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 53 |  |
| 53 | 52 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 54 |  |
| 54 | 53 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 55 |  |
| 55 | 54 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 66 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 67 |  |
| 67 | 66 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 2 | 68 |  |
| 68 | 67 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 69, 99, 112 |  |
| 69 | 68 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 14 | 70, 109 |  |
| 70 | 69 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 11 | 71, 101, 119 |  |
| 71 | 70 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 13 | 72, 82, 115 |  |
| 72 | 71 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 14 | 73, 106 |  |
| 73 | 72 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 74 |  |
| 74 | 73 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 75 |  |
| 75 | 74 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 89 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 14 |  |  |
| 106 | 72 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 82 | 71 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 83, 107 |  |
| 83 | 82 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 10 | 84, 85 |  |
| 84 | 83 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 3 |  |  |
| 85 | 83 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 24 | 123 |  |
| 91 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 21 | 100 |  |
| 100 | 91 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 123 | 85 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 107 | 82 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 3 | 110 |  |
| 110 | 107 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 115 | 71 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 101 | 70 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 102 |  |
| 102 | 101 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 103 |  |
| 103 | 102 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 105 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 119 | 70 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 109 | 69 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 2 | 116 |  |
| 116 | 109 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 99 | 68 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 13 |  |  |
| 112 | 68 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 1 |  |  |
| 78 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 79 |  |
| 79 | 78 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 80, 120 |  |
| 80 | 79 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 81 |  |
| 81 | 80 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 86 |  |
| 86 | 81 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 7 | 108 |  |
| 108 | 86 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 117 |  |
| 117 | 108 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 118 |  |
| 118 | 117 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 120 | 79 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 121 |  |
| 121 | 120 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 122 |  |
| 122 | 121 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 93 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 94 |  |
| 94 | 93 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 95 |  |
| 95 | 94 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 96 |  |
| 96 | 95 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 97 |  |
| 97 | 96 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 98, 111 |  |
| 98 | 97 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 10 | 114 |  |
| 114 | 98 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 |  |  |
| 111 | 97 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 59 |  | (garbage collector) |  | 0 | 0 | 51 |  |  |
| 113 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 |  |  |
| 124 |  | (idle) |  | 0 | 0 | 93 |  |  |
| 129 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 3 | 137 |  |
| 131 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 | 132 |  |
| 132 | 131 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 6 | 133, 171, 183, 202, 218 |  |
| 133 | 132 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 134 |  |
| 134 | 133 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 50 | 135, 174 |  |
| 135 | 134 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 63 | 136, 190, 213 |  |
| 136 | 135 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 42 | 180, 189, 191 |  |
| 180 | 136 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 6 |  |  |
| 189 | 136 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 2 |  |  |
| 191 | 136 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 192 |  |
| 192 | 191 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 6 |  |  |
| 190 | 135 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 4 |  |  |
| 213 | 135 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 174 | 134 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 5 |  |  |
| 171 | 132 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 172, 194 |  |
| 172 | 171 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 1 | 173 |  |
| 173 | 172 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 17 |  |  |
| 194 | 171 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 1 |  |  |
| 183 | 132 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 2 | 199 |  |
| 199 | 183 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 202 | 132 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 218 | 132 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 137 | 129 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 14 | 138, 210 |  |
| 138 | 137 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 20 | 139, 152, 211, 225 |  |
| 139 | 138 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 76 | 140, 197 |  |
| 140 | 139 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 109 | 141, 161, 186 |  |
| 141 | 140 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 123 | 142, 145, 167 |  |
| 142 | 141 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 38 | 143, 179 |  |
| 143 | 142 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 76 | 144, 162, 219 |  |
| 144 | 143 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 201 | 196, 212, 216 |  |
| 163 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 |  |  |
| 165 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 161 | 166, 227 |  |
| 166 | 165 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 29 |  |  |
| 227 | 165 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 228 |  |
| 228 | 227 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 229 |  |
| 229 | 228 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 196 | 144 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 9 |  |  |
| 212 | 144 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 216 | 144 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 162 | 143 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 12 |  |  |
| 219 | 143 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 179 | 142 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 8 | 185 |  |
| 185 | 179 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 145 | 141 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 83 | 146, 175 |  |
| 146 | 145 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 147 |  |
| 147 | 146 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 148 |  |
| 148 | 147 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 151 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 109 |  |  |
| 175 | 145 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 34 |  |  |
| 167 | 141 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 10 |  |  |
| 161 | 140 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 27 |  |  |
| 186 | 140 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 187, 220 |  |
| 187 | 186 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 188 |  |
| 188 | 187 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 220 | 186 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 197 | 139 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 3 | 198 |  |
| 198 | 197 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 231 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 152 | 138 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 95 |  |  |
| 211 | 138 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 1 |  |  |
| 225 | 138 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 1 |  |  |
| 210 | 137 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 1 |  |  |
| 154 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 5 | 155 |  |
| 155 | 154 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 9 | 156, 168, 214 |  |
| 156 | 155 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 157 |  |
| 157 | 156 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 34 | 158, 178 |  |
| 158 | 157 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 77 | 159, 209, 215, 217 |  |
| 159 | 158 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 48 | 176, 184, 224 |  |
| 176 | 159 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 | 177 |  |
| 177 | 176 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 19 |  |  |
| 184 | 159 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 6 |  |  |
| 224 | 159 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 209 | 158 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 4 |  |  |
| 215 | 158 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 217 | 158 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 |  |  |
| 178 | 157 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 4 |  |  |
| 168 | 155 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 3 | 169 |  |
| 169 | 168 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 170 |  |
| 170 | 169 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 6 |  |  |
| 214 | 155 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 2 |  |  |
| 164 |  | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 |  |  |
| 201 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 203 |  |
| 203 | 201 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 223 |  | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 1 |  |  |
| 193 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 200 |  | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 221 |  | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
