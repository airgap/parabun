# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482460193500 |
| endTime | 482461905331 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 108 | flushSync | 6 | 0.41% | 1170 | 79.92% |
| 2 | 109 | flush | 36 | 2.46% | 823 | 56.22% |
| 3 | 110 | #process | 81 | 5.53% | 787 | 53.76% |
| 4 | 111 | flush_queued_effects | 21 | 1.43% | 682 | 46.58% |
| 5 | 112 | is_dirty | 5 | 0.34% | 621 | 42.42% |
| 6 | 113 | update_derived | 8 | 0.55% | 615 | 42.01% |
| 7 | 114 | execute_derived | 9 | 0.61% | 605 | 41.33% |
| 8 | 115 | update_reaction | 13 | 0.89% | 596 | 40.71% |
| 9 | 118 | get | 137 | 9.36% | 579 | 39.55% |
| 10 | 120 | update_derived | 17 | 1.16% | 378 | 25.82% |
| 11 | 121 | execute_derived | 55 | 3.76% | 338 | 23.09% |
| 12 | 126 | set | 6 | 0.41% | 337 | 23.02% |
| 13 | 127 | internal_set | 36 | 2.46% | 330 | 22.54% |
| 14 | 122 | update_reaction | 175 | 11.95% | 272 | 18.58% |
| 15 | 128 | mark_reactions | 7 | 0.48% | 139 | 9.49% |
| 16 | 129 | mark_reactions | 16 | 1.09% | 130 | 8.88% |
| 17 | 139 | ensure | 7 | 0.48% | 127 | 8.67% |
| 18 | 56 | flushSync | 3 | 0.20% | 120 | 8.20% |
| 19 | 140 | Batch | 3 | 0.20% | 119 | 8.13% |
| 20 | 142 | Batch | 116 | 7.92% | 116 | 7.92% |
| 21 | 130 | mark_reactions | 9 | 0.61% | 114 | 7.79% |
| 22 | 131 | mark_reactions | 12 | 0.82% | 101 | 6.90% |
| 23 | 103 | (idle) | 95 | 6.49% | 95 | 6.49% |
| 24 | 124 | get | 79 | 5.40% | 91 | 6.22% |
| 25 | 132 | mark_reactions | 3 | 0.20% | 85 | 5.81% |

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
| 24 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 25, 34 |  |
| 25 | 24 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 26 |  |
| 26 | 25 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 27 |  |
| 27 | 26 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 30 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 31 |  |
| 31 | 30 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 32 |  |
| 32 | 31 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 33 |  |
| 33 | 32 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 34 | 24 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 36 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 37 |  |
| 37 | 36 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 38 |  |
| 38 | 37 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 39 |  |
| 39 | 38 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 40 |  |
| 40 | 39 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 41 |  |
| 41 | 40 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 42 |  |
| 42 | 41 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 43 |  |
| 43 | 42 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 46 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 47 |  |
| 47 | 46 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 48 |  |
| 48 | 47 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 49 |  |
| 49 | 48 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 56 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 3 | 57, 94 |  |
| 57 | 56 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 1 | 58 |  |
| 58 | 57 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 3 | 59, 97 |  |
| 59 | 58 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 1 | 60, 79 |  |
| 60 | 59 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 61 |  |
| 61 | 60 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 62 |  |
| 62 | 61 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 63 |  |
| 63 | 62 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 | 102 |  |
| 66 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 17 | 67, 82 |  |
| 67 | 66 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 68 |  |
| 68 | 67 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 69, 91 |  |
| 69 | 68 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 20 | 95 |  |
| 71 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 12 |  |  |
| 95 | 69 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 91 | 68 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 82 | 66 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 9 |  |  |
| 102 | 63 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 79 | 59 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 80, 101 |  |
| 80 | 79 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 83 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 101 | 79 | execute_effect_teardown | packages/svelte/src/internal/client/reactivity/effects.js | 438 | 40 | 1 |  |  |
| 97 | 58 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 2 |  |  |
| 73 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 74 |  |
| 74 | 73 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 75, 88 |  |
| 75 | 74 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 76 |  |
| 76 | 75 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 77 |  |
| 77 | 76 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 78 |  |
| 78 | 77 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 84 |  |
| 84 | 78 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 85 |  |
| 85 | 84 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 86 |  |
| 86 | 85 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 87 |  |
| 87 | 86 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 92 |  |
| 92 | 87 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 93 |  |
| 93 | 92 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 98 |  |
| 98 | 93 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 99 |  |
| 99 | 98 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 100 |  |
| 100 | 99 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 2 |  |  |
| 88 | 74 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 89 |  |
| 89 | 88 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 90 |  |
| 90 | 89 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 11 |  |  |
| 94 | 56 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 1 |  |  |
| 51 |  | (garbage collector) |  | 0 | 0 | 59 |  |  |
| 103 |  | (idle) |  | 0 | 0 | 95 |  |  |
| 108 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 6 | 109 |  |
| 109 | 108 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 36 | 110 |  |
| 110 | 109 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 81 | 111, 166, 175, 182, 183, 201 |  |
| 111 | 110 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 21 | 112, 137 |  |
| 112 | 111 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 113, 206 |  |
| 113 | 112 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 8 | 114, 148, 173 |  |
| 114 | 113 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 9 | 115 |  |
| 115 | 114 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 13 | 167, 192 |  |
| 118 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 137 | 119, 120 |  |
| 119 | 118 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 41 | 136 |  |
| 136 | 119 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 23 |  |  |
| 120 | 118 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 17 | 121, 138, 144, 172, 199 |  |
| 121 | 120 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 55 | 122, 141 |  |
| 122 | 121 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 175 | 147 |  |
| 124 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 79 | 174, 215 |  |
| 174 | 124 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 11 |  |  |
| 215 | 124 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 216 |  |
| 216 | 215 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 217 |  |
| 217 | 216 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 147 | 122 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 6 |  |  |
| 141 | 121 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 11 |  |  |
| 138 | 120 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 144 | 120 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 10 | 145 |  |
| 145 | 144 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 5 |  |  |
| 172 | 120 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 6 |  |  |
| 199 | 120 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 197 |  | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 167 | 115 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 192 | 115 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 148 | 113 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 173 | 113 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 206 | 112 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 137 | 111 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 12 | 151, 196, 204 |  |
| 151 | 137 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 16 |  |  |
| 181 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 10 |  |  |
| 196 | 137 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 204 | 137 | destroy_effect_children | packages/svelte/src/internal/client/reactivity/effects.js | 459 | 40 | 1 |  |  |
| 166 | 110 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 13 |  |  |
| 175 | 110 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 5 |  |  |
| 182 | 110 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 3 |  |  |
| 183 | 110 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 2 |  |  |
| 201 | 110 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 0 | 202 |  |
| 202 | 201 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 126 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 6 | 127, 203 |  |
| 127 | 126 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 36 | 128, 139, 143, 149 |  |
| 128 | 127 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 7 | 129, 170 |  |
| 129 | 128 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 16 | 130 |  |
| 130 | 129 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 131, 184, 193 |  |
| 131 | 130 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 12 | 132, 185, 189 |  |
| 132 | 131 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 133, 191 |  |
| 133 | 132 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 10 | 134, 210, 211 |  |
| 134 | 133 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 11 | 135, 209 |  |
| 135 | 134 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 7 | 146 |  |
| 146 | 135 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 13 | 150, 194 |  |
| 150 | 146 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 18 | 176 |  |
| 176 | 150 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 7 | 186, 198 |  |
| 186 | 176 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 | 187 |  |
| 187 | 186 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 8 |  |  |
| 198 | 176 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 194 | 146 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 209 | 134 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 210 | 133 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 211 | 133 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 191 | 132 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 185 | 131 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 189 | 131 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 184 | 130 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 193 | 130 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 3 |  |  |
| 170 | 128 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 139 | 127 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 7 | 140, 213 |  |
| 140 | 139 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 3 | 142 |  |
| 142 | 140 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 116 |  |  |
| 213 | 139 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 1 |  |  |
| 143 | 127 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 26 |  |  |
| 149 | 127 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 203 | 126 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 153 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 154 |  |
| 154 | 153 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 155, 207 |  |
| 155 | 154 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 156 |  |
| 156 | 155 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 157 |  |
| 157 | 156 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 158 |  |
| 158 | 157 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 159 |  |
| 159 | 158 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 160 |  |
| 160 | 159 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 161 |  |
| 161 | 160 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 162 |  |
| 162 | 161 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 163 |  |
| 163 | 162 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 164 |  |
| 164 | 163 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 165 |  |
| 165 | 164 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 168 |  |
| 168 | 165 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 169 |  |
| 169 | 168 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 207 | 154 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 208 |  |
| 208 | 207 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 1 |  |  |
| 171 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 7 | 190 |  |
| 190 | 171 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 188 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
