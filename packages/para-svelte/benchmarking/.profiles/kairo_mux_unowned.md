# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482455059050 |
| endTime | 482458081495 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 123 | flushSync | 4 | 0.20% | 1690 | 82.92% |
| 2 | 124 | flush | 22 | 1.08% | 1237 | 60.70% |
| 3 | 125 | #process | 19 | 0.93% | 1215 | 59.62% |
| 4 | 126 | flush_queued_effects | 90 | 4.42% | 1094 | 53.68% |
| 5 | 127 | is_dirty | 91 | 4.47% | 999 | 49.02% |
| 6 | 128 | is_dirty | 124 | 6.08% | 877 | 43.03% |
| 7 | 148 | update_derived | 39 | 1.91% | 482 | 23.65% |
| 8 | 149 | execute_derived | 73 | 3.58% | 418 | 20.51% |
| 9 | 150 | update_reaction | 155 | 7.61% | 327 | 16.05% |
| 10 | 129 | is_dirty | 85 | 4.17% | 251 | 12.32% |
| 11 | 142 | internal_set | 11 | 0.54% | 235 | 11.53% |
| 12 | 141 | set | 0 | 0.00% | 235 | 11.53% |
| 13 | 136 | set | 4 | 0.20% | 213 | 10.45% |
| 14 | 143 | mark_reactions | 1 | 0.05% | 210 | 10.30% |
| 15 | 144 | mark_reactions | 45 | 2.21% | 209 | 10.26% |
| 16 | 137 | internal_set | 3 | 0.15% | 209 | 10.26% |
| 17 | 139 | mark_reactions | 52 | 2.55% | 192 | 9.42% |
| 18 | 138 | mark_reactions | 0 | 0.00% | 192 | 9.42% |
| 19 | 66 | flushSync | 0 | 0.00% | 171 | 8.39% |
| 20 | 145 | mark_reactions | 81 | 3.97% | 162 | 7.95% |
| 21 | 160 | get | 139 | 6.82% | 159 | 7.80% |
| 22 | 131 | execute_derived | 2 | 0.10% | 140 | 6.87% |
| 23 | 130 | update_derived | 0 | 0.00% | 140 | 6.87% |
| 24 | 132 | update_reaction | 7 | 0.34% | 138 | 6.77% |
| 25 | 151 | mark_reactions | 62 | 3.04% | 136 | 6.67% |

## Nodes
| ID | Parent ID | Function | URL | Line | Column | Hit count | Children | Deopt reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 10 |  |
| 10 | 9 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 11 |  |
| 11 | 10 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 12 |  |
| 12 | 11 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 15 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 16 |  |
| 16 | 15 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 17 |  |
| 17 | 16 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 18 |  |
| 18 | 17 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 20 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 21, 34 |  |
| 21 | 20 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 22 |  |
| 22 | 21 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 23 |  |
| 23 | 22 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 25 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 26 |  |
| 26 | 25 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 27 |  |
| 27 | 26 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 28 |  |
| 28 | 27 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 30 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 31 |  |
| 31 | 30 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 32 |  |
| 32 | 31 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 33 |  |
| 33 | 32 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 34 | 20 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 36 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 37 |  |
| 37 | 36 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 39 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 49 |  |
| 41 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 42 |  |
| 42 | 41 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 43 |  |
| 43 | 42 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 44 |  |
| 44 | 43 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 45 |  |
| 45 | 44 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 46 |  |
| 46 | 45 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 47 |  |
| 47 | 46 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 48 |  |
| 48 | 47 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 49 | 39 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 50 |  |
| 50 | 49 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 51 |  |
| 51 | 50 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 52 |  |
| 52 | 51 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 53 |  |
| 53 | 52 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 54, 56 |  |
| 54 | 53 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 55 |  |
| 55 | 54 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 56 | 53 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 57 |  |
| 57 | 56 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 58 |  |
| 58 | 57 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 59 |  |
| 59 | 58 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 66 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 67 |  |
| 67 | 66 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 68 |  |
| 68 | 67 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 1 | 69, 100 |  |
| 69 | 68 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 5 | 70 |  |
| 70 | 69 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 71, 82, 107, 116 |  |
| 71 | 70 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 11 | 72, 77 |  |
| 72 | 71 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 73, 105 |  |
| 73 | 72 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 74 |  |
| 74 | 73 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 75 |  |
| 75 | 74 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 99 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 8 |  |  |
| 105 | 72 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 |  |  |
| 77 | 71 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 6 | 78, 102 |  |
| 78 | 77 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 79, 92 |  |
| 79 | 78 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 26 | 111 |  |
| 81 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 11 | 106 |  |
| 106 | 81 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 111 | 79 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 92 | 78 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 5 |  |  |
| 102 | 77 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 | 103 |  |
| 103 | 102 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 82 | 70 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 4 |  |  |
| 107 | 70 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 116 | 70 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 117 |  |
| 117 | 116 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 100 | 68 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 11 |  |  |
| 84 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 85 |  |
| 85 | 84 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 86 |  |
| 86 | 85 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 87 |  |
| 87 | 86 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 88 |  |
| 88 | 87 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 89, 110 |  |
| 89 | 88 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 90, 112 |  |
| 90 | 89 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 | 91 |  |
| 91 | 90 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 6 |  |  |
| 112 | 89 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 110 | 88 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 94 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 3 | 95 |  |
| 95 | 94 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 96 |  |
| 96 | 95 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 97 |  |
| 97 | 96 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 108 |  |
| 108 | 97 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 109, 115 |  |
| 109 | 108 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 113 |  |
| 113 | 109 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 114 |  |
| 114 | 113 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 115 | 108 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 61 |  | (garbage collector) |  | 0 | 0 | 51 |  |  |
| 104 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 16 |  |  |
| 118 |  | (idle) |  | 0 | 0 | 95 |  |  |
| 123 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 4 | 124 |  |
| 124 | 123 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 22 | 125 |  |
| 125 | 124 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 19 | 126, 154, 205 |  |
| 126 | 125 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 90 | 127, 188 |  |
| 127 | 126 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 91 | 128, 155, 182 |  |
| 128 | 127 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 124 | 129, 148, 167 |  |
| 129 | 128 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 85 | 130, 166 |  |
| 130 | 129 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 131 |  |
| 131 | 130 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 132 |  |
| 132 | 131 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 153 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 131 |  |  |
| 166 | 129 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 26 |  |  |
| 148 | 128 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 39 | 149, 163, 207 |  |
| 149 | 148 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 73 | 150, 170, 181 |  |
| 150 | 149 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 155 | 174, 200, 202 |  |
| 160 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 139 | 165, 178 |  |
| 165 | 160 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 19 |  |  |
| 178 | 160 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 179 |  |
| 179 | 178 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 180 |  |
| 180 | 179 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 174 | 150 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 10 |  |  |
| 200 | 150 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 202 | 150 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 170 | 149 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 16 |  |  |
| 181 | 149 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 2 |  |  |
| 163 | 148 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 17 | 175 |  |
| 175 | 163 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 7 |  |  |
| 207 | 148 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 167 | 128 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 20 |  |  |
| 155 | 127 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 26 |  |  |
| 182 | 127 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 193 |  |
| 193 | 182 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 194 |  |
| 194 | 193 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 196 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 188 | 126 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 3 | 189 |  |
| 189 | 188 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 199 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 154 | 125 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 101 |  |  |
| 205 | 125 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 136 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 4 | 137 |  |
| 137 | 136 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 3 | 138, 171, 191, 192 |  |
| 138 | 137 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 139 |  |
| 139 | 138 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 52 | 151, 164 |  |
| 151 | 139 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 62 | 152, 185, 201 |  |
| 152 | 151 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 45 | 161, 183, 187 |  |
| 161 | 152 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 2 | 162 |  |
| 162 | 161 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 16 |  |  |
| 183 | 152 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 5 |  |  |
| 187 | 152 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 185 | 151 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 201 | 151 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 164 | 139 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 4 |  |  |
| 171 | 137 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 2 | 172 |  |
| 172 | 171 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 1 | 173 |  |
| 173 | 172 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 7 |  |  |
| 191 | 137 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 192 | 137 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 3 |  |  |
| 141 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 142 |  |
| 142 | 141 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 11 | 143, 156, 197 |  |
| 143 | 142 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 144 |  |
| 144 | 143 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 45 | 145, 198 |  |
| 145 | 144 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 81 | 146, 176, 177 |  |
| 146 | 145 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 50 | 147, 168, 184 |  |
| 147 | 146 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 168 | 146 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 2 | 169 |  |
| 169 | 168 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 15 |  |  |
| 184 | 146 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 7 |  |  |
| 176 | 145 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 3 |  |  |
| 177 | 145 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 198 | 144 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 156 | 142 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 157 |  |
| 157 | 156 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 2 | 158 |  |
| 158 | 157 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 10 |  |  |
| 197 | 142 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 2 |  |  |
| 204 |  | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 |  |  |
| 203 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 186 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
