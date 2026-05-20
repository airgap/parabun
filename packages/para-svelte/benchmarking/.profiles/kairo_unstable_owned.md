# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482463614095 |
| endTime | 482465093972 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 113 | flushSync | 6 | 0.49% | 929 | 76.52% |
| 2 | 114 | flush | 34 | 2.80% | 634 | 52.22% |
| 3 | 115 | #process | 67 | 5.52% | 600 | 49.42% |
| 4 | 116 | flush_queued_effects | 22 | 1.81% | 510 | 42.01% |
| 5 | 117 | is_dirty | 7 | 0.58% | 447 | 36.82% |
| 6 | 118 | update_derived | 3 | 0.25% | 440 | 36.24% |
| 7 | 119 | execute_derived | 17 | 1.40% | 436 | 35.91% |
| 8 | 120 | update_reaction | 60 | 4.94% | 413 | 34.02% |
| 9 | 122 | get | 216 | 17.79% | 313 | 25.78% |
| 10 | 128 | set | 20 | 1.65% | 282 | 23.23% |
| 11 | 129 | internal_set | 40 | 3.29% | 262 | 21.58% |
| 12 | 130 | ensure | 9 | 0.74% | 155 | 12.77% |
| 13 | 131 | Batch | 8 | 0.66% | 141 | 11.61% |
| 14 | 132 | Batch | 133 | 10.96% | 133 | 10.96% |
| 15 | 62 | flushSync | 0 | 0.00% | 103 | 8.48% |
| 16 | 108 | (idle) | 98 | 8.07% | 98 | 8.07% |
| 17 | 64 | #process | 12 | 0.99% | 79 | 6.51% |
| 18 | 63 | flush | 0 | 0.00% | 79 | 6.51% |
| 19 | 57 | (garbage collector) | 66 | 5.44% | 66 | 5.44% |
| 20 | 65 | flush_queued_effects | 4 | 0.33% | 65 | 5.35% |
| 21 | 67 | update_derived | 3 | 0.25% | 57 | 4.70% |
| 22 | 66 | is_dirty | 0 | 0.00% | 57 | 4.70% |
| 23 | 133 | update_derived | 5 | 0.41% | 51 | 4.20% |
| 24 | 68 | execute_derived | 1 | 0.08% | 51 | 4.20% |
| 25 | 69 | update_reaction | 12 | 0.99% | 50 | 4.12% |

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
| 24 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 25, 33 |  |
| 25 | 24 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 26 |  |
| 26 | 25 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 27 |  |
| 27 | 26 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 29 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 30 |  |
| 30 | 29 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 31 |  |
| 31 | 30 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 32 |  |
| 32 | 31 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 33 | 24 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 35 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 36 |  |
| 36 | 35 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 37 |  |
| 37 | 36 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 38 |  |
| 38 | 37 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 39 |  |
| 39 | 38 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 40, 49 |  |
| 40 | 39 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 41 |  |
| 41 | 40 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 42 |  |
| 42 | 41 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 | 43 |  |
| 43 | 42 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 0 | 44 |  |
| 44 | 43 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 0 |  |  |
| 46 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 47 |  |
| 47 | 46 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 48 |  |
| 48 | 47 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 |  |  |
| 49 | 39 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 51 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 52 |  |
| 52 | 51 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 |  |  |
| 54 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 55 |  |
| 55 | 54 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 56 |  |
| 56 | 55 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 62 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 63 |  |
| 63 | 62 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 64 |  |
| 64 | 63 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 12 | 65, 100, 104 |  |
| 65 | 64 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 4 | 66, 72 |  |
| 66 | 65 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 67 |  |
| 67 | 66 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 68, 80 |  |
| 68 | 67 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 69 |  |
| 69 | 68 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 12 | 91 |  |
| 71 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 17 | 76, 77, 81, 102 |  |
| 76 | 71 | reconnect | packages/svelte/src/internal/client/runtime.js | 696 | 19 | 2 |  |  |
| 77 | 71 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 78 |  |
| 78 | 77 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 79 |  |
| 79 | 78 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 103 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 81 | 71 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 |  |  |
| 102 | 71 | unfreeze_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 464 | 41 | 1 |  |  |
| 91 | 69 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 1 | 92 |  |
| 92 | 91 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 3 | 93 |  |
| 93 | 92 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 0 | 94 |  |
| 94 | 93 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 1 |  |  |
| 80 | 67 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 3 |  |  |
| 72 | 65 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 73 |  |
| 73 | 72 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 75 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 100 | 64 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 1 |  |  |
| 104 | 64 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 1 |  |  |
| 83 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 1 | 84 |  |
| 84 | 83 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 3 | 85, 90, 95 |  |
| 85 | 84 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 86 |  |
| 86 | 85 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 87 |  |
| 87 | 86 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 88 |  |
| 88 | 87 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 89 |  |
| 89 | 88 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 1 |  |  |
| 90 | 84 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 95 | 84 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 96, 101 |  |
| 96 | 95 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 97 |  |
| 97 | 96 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 12 |  |  |
| 101 | 95 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 1 |  |  |
| 57 |  | (garbage collector) |  | 0 | 0 | 66 |  |  |
| 108 |  | (idle) |  | 0 | 0 | 98 |  |  |
| 113 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 6 | 114, 168 |  |
| 114 | 113 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 34 | 115 |  |
| 115 | 114 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 67 | 116, 141, 146, 148, 176, 177 |  |
| 116 | 115 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 22 | 117, 125 |  |
| 117 | 116 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 118 |  |
| 118 | 117 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 119, 188 |  |
| 119 | 118 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 17 | 120, 173, 174, 187 |  |
| 120 | 119 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 60 | 137, 167, 175 |  |
| 122 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 216 | 123, 133, 154 |  |
| 123 | 122 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 36 | 124 |  |
| 124 | 123 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 |  |  |
| 133 | 122 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 5 | 134, 185 |  |
| 134 | 133 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 135, 184 |  |
| 135 | 134 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 32 |  |  |
| 143 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 158 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 184 | 134 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 185 | 133 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 186 |  |
| 186 | 185 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 154 | 122 | reconnect | packages/svelte/src/internal/client/runtime.js | 696 | 19 | 6 |  |  |
| 137 | 120 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 2 | 138 |  |
| 138 | 137 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 17 | 140, 151 |  |
| 140 | 138 | remove_reactions | packages/svelte/src/internal/client/runtime.js | 424 | 33 | 6 | 150 |  |
| 150 | 140 | remove_reaction | packages/svelte/src/internal/client/runtime.js | 367 | 25 | 8 |  |  |
| 151 | 138 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 3 | 152 |  |
| 152 | 151 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 167 | 120 | effect_tracking | packages/svelte/src/internal/client/reactivity/effects.js | 186 | 32 | 1 |  |  |
| 175 | 120 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 173 | 119 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 4 |  |  |
| 174 | 119 | effect_tracking | packages/svelte/src/internal/client/reactivity/effects.js | 186 | 32 | 1 |  |  |
| 187 | 119 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 188 | 118 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 189 |  |
| 189 | 188 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 125 | 116 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 15 | 126 |  |
| 126 | 125 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 16 | 147 |  |
| 147 | 126 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 3 |  |  |
| 171 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 7 |  |  |
| 141 | 115 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 2 |  |  |
| 146 | 115 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 14 |  |  |
| 148 | 115 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 3 |  |  |
| 176 | 115 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 |  |  |
| 177 | 115 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 3 |  |  |
| 128 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 20 | 129 |  |
| 129 | 128 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 40 | 130, 136, 144, 145, 190 |  |
| 130 | 129 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 9 | 131, 165 |  |
| 131 | 130 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 8 | 132 |  |
| 132 | 131 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 133 |  |  |
| 165 | 130 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 5 |  |  |
| 136 | 129 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 25 | 139 |  |
| 139 | 136 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 144 | 129 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 145 | 129 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 11 | 149, 169, 178 |  |
| 149 | 145 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 155 |  |
| 155 | 149 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 7 | 156, 166 |  |
| 156 | 155 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 1 | 157 |  |
| 157 | 156 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 6 |  |  |
| 166 | 155 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 2 |  |  |
| 169 | 145 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 178 | 145 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 190 | 129 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 160 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 161 |  |
| 161 | 160 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 162 |  |
| 162 | 161 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 1 | 163 |  |
| 163 | 162 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 164 |  |
| 164 | 163 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 168 | 113 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 5 |  |  |
| 172 |  | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 1 |  |  |
