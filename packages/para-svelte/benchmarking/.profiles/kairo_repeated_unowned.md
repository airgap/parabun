# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482459172861 |
| endTime | 482460190243 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 75 | flushSync | 4 | 0.49% | 600 | 73.89% |
| 2 | 76 | flush | 26 | 3.20% | 353 | 43.47% |
| 3 | 77 | #process | 57 | 7.02% | 327 | 40.27% |
| 4 | 78 | flush_queued_effects | 25 | 3.08% | 251 | 30.91% |
| 5 | 87 | set | 19 | 2.34% | 239 | 29.43% |
| 6 | 88 | internal_set | 43 | 5.30% | 220 | 27.09% |
| 7 | 81 | is_dirty | 2 | 0.25% | 175 | 21.55% |
| 8 | 82 | update_derived | 1 | 0.12% | 171 | 21.06% |
| 9 | 83 | execute_derived | 6 | 0.74% | 168 | 20.69% |
| 10 | 84 | update_reaction | 24 | 2.96% | 160 | 19.70% |
| 11 | 93 | get | 130 | 16.01% | 130 | 16.01% |
| 12 | 89 | ensure | 6 | 0.74% | 121 | 14.90% |
| 13 | 90 | Batch | 8 | 0.99% | 111 | 13.67% |
| 14 | 91 | Batch | 103 | 12.68% | 103 | 12.68% |
| 15 | 70 | (idle) | 93 | 11.45% | 93 | 11.45% |
| 16 | 39 | flushSync | 0 | 0.00% | 57 | 7.02% |
| 17 | 79 | update_effect | 21 | 2.59% | 51 | 6.28% |
| 18 | 34 | (garbage collector) | 45 | 5.54% | 45 | 5.54% |
| 19 | 45 | #process | 6 | 0.74% | 40 | 4.93% |
| 20 | 44 | flush | 0 | 0.00% | 40 | 4.93% |
| 21 | 99 | mark_reactions | 19 | 2.34% | 34 | 4.19% |
| 22 | 80 | update_reaction | 17 | 2.09% | 30 | 3.69% |
| 23 | 46 | flush_queued_effects | 1 | 0.12% | 30 | 3.69% |
| 24 | 47 | is_dirty | 2 | 0.25% | 22 | 2.71% |
| 25 | 103 | capture | 20 | 2.46% | 21 | 2.59% |

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
| 24 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 25 |  |
| 25 | 24 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 26 |  |
| 26 | 25 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 27 |  |
| 27 | 26 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 28 |  |
| 28 | 27 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 29 |  |
| 29 | 28 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 30 |  |
| 30 | 29 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 31 |  |
| 31 | 30 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 33 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 39 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 44 |  |
| 41 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 3 | 42 |  |
| 42 | 41 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 43, 52, 59 |  |
| 43 | 42 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 2 |  |  |
| 52 | 42 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 53 |  |
| 53 | 52 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 54 |  |
| 54 | 53 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 55 |  |
| 55 | 54 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 3 |  |  |
| 59 | 42 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 60 |  |
| 60 | 59 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 61 |  |
| 61 | 60 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 7 |  |  |
| 44 | 39 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 45 |  |
| 45 | 44 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 6 | 46, 65, 66, 69 |  |
| 46 | 45 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 1 | 47, 57 |  |
| 47 | 46 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 48 |  |
| 48 | 47 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 49 |  |
| 49 | 48 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 50 |  |
| 50 | 49 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 56 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 17 |  |  |
| 57 | 46 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 2 | 58 |  |
| 58 | 57 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 | 63 |  |
| 63 | 58 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 67 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 65 | 45 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 2 |  |  |
| 66 | 45 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 69 | 45 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 62 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 34 |  | (garbage collector) |  | 0 | 0 | 45 |  |  |
| 70 |  | (idle) |  | 0 | 0 | 93 |  |  |
| 75 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 4 | 76, 113 |  |
| 76 | 75 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 26 | 77 |  |
| 77 | 76 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 57 | 78, 92, 105, 107, 109, 124 |  |
| 78 | 77 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 25 | 79, 81 |  |
| 79 | 78 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 21 | 80 |  |
| 80 | 79 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 17 | 119 |  |
| 95 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 12 |  |  |
| 119 | 80 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 81 | 78 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 82, 98 |  |
| 82 | 81 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 83, 110, 112 |  |
| 83 | 82 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 84, 111 |  |
| 84 | 83 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 24 | 97 |  |
| 93 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 130 |  |  |
| 97 | 84 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 6 |  |  |
| 111 | 83 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 110 | 82 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 112 | 82 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 98 | 81 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 92 | 77 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 3 |  |  |
| 105 | 77 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 4 |  |  |
| 107 | 77 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 109 | 77 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 9 |  |  |
| 124 | 77 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 | 125 |  |
| 125 | 124 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 87 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 19 | 88 |  |
| 88 | 87 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 43 | 89, 99, 103, 118 |  |
| 89 | 88 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 6 | 90, 126 |  |
| 90 | 89 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 8 | 91 |  |
| 91 | 90 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 103 |  |  |
| 126 | 89 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 4 |  |  |
| 99 | 88 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 19 | 100 |  |
| 100 | 99 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 101, 106 |  |
| 101 | 100 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 102 |  |
| 102 | 101 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 9 |  |  |
| 106 | 100 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 103 | 88 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 20 | 133 |  |
| 133 | 103 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 118 | 88 | equals | packages/svelte/src/internal/client/reactivity/equality.js | 4 | 23 | 1 |  |  |
| 113 | 75 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 3 |  |  |
| 128 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 129 |  |
| 129 | 128 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 130 |  |
| 130 | 129 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 131 |  |
| 131 | 130 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 132 |  |
| 132 | 131 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 96 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 6 | 104 |  |
| 104 | 96 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 |  |  |
