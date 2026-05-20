# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482440146519 |
| endTime | 482442085309 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1166 | flushSync | 7 | 0.41% | 1382 | 80.21% |
| 2 | 1185 | flush | 20 | 1.16% | 1064 | 61.75% |
| 3 | 1186 | #process | 42 | 2.44% | 1044 | 60.59% |
| 4 | 1187 | flush_queued_effects | 12 | 0.70% | 990 | 57.46% |
| 5 | 1188 | is_dirty | 5 | 0.29% | 954 | 55.37% |
| 6 | 1189 | is_dirty | 1 | 0.06% | 935 | 54.27% |
| 7 | 1190 | is_dirty | 4 | 0.23% | 920 | 53.40% |
| 8 | 1191 | is_dirty | 5 | 0.29% | 901 | 52.29% |
| 9 | 1192 | is_dirty | 5 | 0.29% | 881 | 51.13% |
| 10 | 1193 | is_dirty | 5 | 0.29% | 864 | 50.15% |
| 11 | 1194 | is_dirty | 4 | 0.23% | 845 | 49.04% |
| 12 | 1195 | is_dirty | 1 | 0.06% | 832 | 48.29% |
| 13 | 1196 | is_dirty | 6 | 0.35% | 821 | 47.65% |
| 14 | 1197 | is_dirty | 1 | 0.06% | 800 | 46.43% |
| 15 | 1198 | is_dirty | 1 | 0.06% | 788 | 45.73% |
| 16 | 1199 | is_dirty | 4 | 0.23% | 776 | 45.04% |
| 17 | 1200 | is_dirty | 3 | 0.17% | 758 | 43.99% |
| 18 | 1201 | is_dirty | 3 | 0.17% | 737 | 42.77% |
| 19 | 1202 | is_dirty | 5 | 0.29% | 708 | 41.09% |
| 20 | 1242 | is_dirty | 5 | 0.29% | 686 | 39.81% |
| 21 | 1243 | is_dirty | 3 | 0.17% | 669 | 38.83% |
| 22 | 1244 | is_dirty | 1 | 0.06% | 654 | 37.96% |
| 23 | 1245 | is_dirty | 4 | 0.23% | 634 | 36.80% |
| 24 | 1246 | is_dirty | 3 | 0.17% | 624 | 36.22% |
| 25 | 1247 | is_dirty | 2 | 0.12% | 599 | 34.76% |

## Nodes
| ID | Parent ID | Function | URL | Line | Column | Hit count | Children | Deopt reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 519 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 520 |  |
| 520 | 519 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 521 |  |
| 521 | 520 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 522 |  |
| 522 | 521 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 524 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 525 |  |
| 525 | 524 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 526 |  |
| 526 | 525 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 527 |  |
| 527 | 526 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 529 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 530 |  |
| 530 | 529 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 531 |  |
| 531 | 530 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 532 |  |
| 532 | 531 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 534 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 535 |  |
| 535 | 534 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 536 |  |
| 536 | 535 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 537 |  |
| 537 | 536 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 539 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 540 |  |
| 540 | 539 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 541 |  |
| 541 | 540 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 542 |  |
| 542 | 541 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 544 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 545 |  |
| 545 | 544 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 546 |  |
| 546 | 545 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 547 |  |
| 547 | 546 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 549 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 550 |  |
| 550 | 549 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 551 |  |
| 551 | 550 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 552 |  |
| 552 | 551 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 554 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 555 |  |
| 555 | 554 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 556 |  |
| 556 | 555 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 557 |  |
| 557 | 556 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 559 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 560 |  |
| 560 | 559 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 561 |  |
| 561 | 560 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 562 |  |
| 562 | 561 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 564 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 565 |  |
| 565 | 564 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 566 |  |
| 566 | 565 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 567 |  |
| 567 | 566 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 569 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 570 |  |
| 570 | 569 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 571 |  |
| 571 | 570 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 572 |  |
| 572 | 571 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 574 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 575 |  |
| 575 | 574 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 576 |  |
| 576 | 575 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 577 |  |
| 577 | 576 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 579 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 580 |  |
| 580 | 579 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 581 |  |
| 581 | 580 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 582 |  |
| 582 | 581 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 584 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 585 |  |
| 585 | 584 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 586 |  |
| 586 | 585 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 587 |  |
| 587 | 586 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 589 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 590 |  |
| 590 | 589 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 591 |  |
| 591 | 590 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 592 |  |
| 592 | 591 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 594 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 595 |  |
| 595 | 594 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 596 |  |
| 596 | 595 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 597 |  |
| 597 | 596 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 599 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 600 |  |
| 600 | 599 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 601 |  |
| 601 | 600 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 602 |  |
| 602 | 601 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 604 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 605 |  |
| 605 | 604 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 606 |  |
| 606 | 605 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 607 |  |
| 607 | 606 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 609 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 610 |  |
| 610 | 609 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 611 |  |
| 611 | 610 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 612 |  |
| 612 | 611 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 614 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 615 |  |
| 615 | 614 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 616 |  |
| 616 | 615 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 617 |  |
| 617 | 616 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 619 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 620 |  |
| 620 | 619 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 621 |  |
| 621 | 620 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 622 |  |
| 622 | 621 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 624 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 625 |  |
| 625 | 624 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 626 |  |
| 626 | 625 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 627 |  |
| 627 | 626 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 629 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 630 |  |
| 630 | 629 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 631 |  |
| 631 | 630 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 632 |  |
| 632 | 631 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 634 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 635 |  |
| 635 | 634 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 636 |  |
| 636 | 635 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 637 |  |
| 637 | 636 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 639 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 640 |  |
| 640 | 639 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 641 |  |
| 641 | 640 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 642 |  |
| 642 | 641 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 644 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 645 |  |
| 645 | 644 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 646 |  |
| 646 | 645 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 647 |  |
| 647 | 646 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 649 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 650 |  |
| 650 | 649 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 651 |  |
| 651 | 650 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 652 |  |
| 652 | 651 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 654 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 655 |  |
| 655 | 654 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 656 |  |
| 656 | 655 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 657 |  |
| 657 | 656 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 659 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 660 |  |
| 660 | 659 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 661 |  |
| 661 | 660 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 662 |  |
| 662 | 661 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 664 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 665 |  |
| 665 | 664 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 666 |  |
| 666 | 665 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 667 |  |
| 667 | 666 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 669 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 670 |  |
| 670 | 669 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 671 |  |
| 671 | 670 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 672 |  |
| 672 | 671 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 674 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 675 |  |
| 675 | 674 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 676 |  |
| 676 | 675 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 677 |  |
| 677 | 676 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 679 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 680 |  |
| 680 | 679 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 681 |  |
| 681 | 680 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 682 |  |
| 682 | 681 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 684 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 685 |  |
| 685 | 684 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 686 |  |
| 686 | 685 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 687 |  |
| 687 | 686 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 689 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 690 |  |
| 690 | 689 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 691 |  |
| 691 | 690 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 692 |  |
| 692 | 691 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 694 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 695 |  |
| 695 | 694 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 696 |  |
| 696 | 695 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 697 |  |
| 697 | 696 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 699 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 700 |  |
| 700 | 699 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 701 |  |
| 701 | 700 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 702 |  |
| 702 | 701 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 704 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 705 |  |
| 705 | 704 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 706 |  |
| 706 | 705 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 707 |  |
| 707 | 706 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 709 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 710 |  |
| 710 | 709 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 711 |  |
| 711 | 710 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 712 |  |
| 712 | 711 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 714 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 715 |  |
| 715 | 714 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 716 |  |
| 716 | 715 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 717 |  |
| 717 | 716 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 719 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 720 |  |
| 720 | 719 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 721 |  |
| 721 | 720 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 722 |  |
| 722 | 721 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 724 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 725 |  |
| 725 | 724 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 726 |  |
| 726 | 725 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 727 |  |
| 727 | 726 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 729 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 730 |  |
| 730 | 729 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 731 |  |
| 731 | 730 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 732 |  |
| 732 | 731 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 734 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 735 |  |
| 735 | 734 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 736 |  |
| 736 | 735 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 737 |  |
| 737 | 736 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 739 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 740 |  |
| 740 | 739 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 741 |  |
| 741 | 740 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 742 |  |
| 742 | 741 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 744 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 745 |  |
| 745 | 744 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 746 |  |
| 746 | 745 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 747 |  |
| 747 | 746 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 749 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 750 |  |
| 750 | 749 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 751 |  |
| 751 | 750 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 752 |  |
| 752 | 751 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 754 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 755 |  |
| 755 | 754 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 756 |  |
| 756 | 755 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 757 |  |
| 757 | 756 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 759 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 760 |  |
| 760 | 759 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 761 |  |
| 761 | 760 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 762 |  |
| 762 | 761 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 764 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 765 |  |
| 765 | 764 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 766 |  |
| 766 | 765 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 767 |  |
| 767 | 766 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 769 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 770 |  |
| 770 | 769 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 771 |  |
| 771 | 770 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 772 |  |
| 772 | 771 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 1 | 773 |  |
| 773 | 772 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 774 |  |
| 774 | 773 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 775, 827 |  |
| 775 | 774 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 776 |  |
| 776 | 775 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 777 |  |
| 777 | 776 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 778 |  |
| 778 | 777 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 779 |  |
| 779 | 778 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 780 |  |
| 780 | 779 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 781 |  |
| 781 | 780 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 782 |  |
| 782 | 781 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 783 |  |
| 783 | 782 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 784 |  |
| 784 | 783 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 785 |  |
| 785 | 784 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 786 |  |
| 786 | 785 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 787 |  |
| 787 | 786 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 788 |  |
| 788 | 787 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 789 |  |
| 789 | 788 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 790 |  |
| 790 | 789 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 791 |  |
| 791 | 790 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 792 |  |
| 792 | 791 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 793 |  |
| 793 | 792 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 794 |  |
| 794 | 793 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 795 |  |
| 795 | 794 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 796 |  |
| 796 | 795 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 797 |  |
| 797 | 796 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 798 |  |
| 798 | 797 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 799 |  |
| 799 | 798 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 800 |  |
| 800 | 799 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 801 |  |
| 801 | 800 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 802 |  |
| 802 | 801 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 803 |  |
| 803 | 802 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 804 |  |
| 804 | 803 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 805 |  |
| 805 | 804 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 806 |  |
| 806 | 805 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 807 |  |
| 807 | 806 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 808 |  |
| 808 | 807 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 809 |  |
| 809 | 808 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 810 |  |
| 810 | 809 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 811 |  |
| 811 | 810 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 812 |  |
| 812 | 811 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 813 |  |
| 813 | 812 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 814 |  |
| 814 | 813 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 815 |  |
| 815 | 814 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 816 |  |
| 816 | 815 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 817 |  |
| 817 | 816 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 818 |  |
| 818 | 817 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 819 |  |
| 819 | 818 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 820 |  |
| 820 | 819 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 821 |  |
| 821 | 820 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 822 |  |
| 822 | 821 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 823 |  |
| 823 | 822 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 824 |  |
| 824 | 823 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 825 |  |
| 825 | 824 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 | 826 |  |
| 826 | 825 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 827 | 774 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 828 |  |
| 828 | 827 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 834 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 1 | 835 |  |
| 835 | 834 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 4 | 836 |  |
| 836 | 835 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 3 | 837 |  |
| 837 | 836 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 838, 1138 |  |
| 838 | 837 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 839, 1001 |  |
| 839 | 838 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 840, 1066 |  |
| 840 | 839 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 841, 1013 |  |
| 841 | 840 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 842, 912 |  |
| 842 | 841 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 843, 1107 |  |
| 843 | 842 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 844, 1046 |  |
| 844 | 843 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 845, 1002 |  |
| 845 | 844 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 846, 879 |  |
| 846 | 845 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 847, 1108 |  |
| 847 | 846 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 848, 1111 |  |
| 848 | 847 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 849, 1018 |  |
| 849 | 848 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 850, 918 |  |
| 850 | 849 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 851, 903 |  |
| 851 | 850 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 852 |  |
| 852 | 851 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 853, 1128 |  |
| 853 | 852 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 854, 1053 |  |
| 854 | 853 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 855, 1102 |  |
| 855 | 854 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 856, 1094 |  |
| 856 | 855 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 857, 1040 |  |
| 857 | 856 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 858, 986 |  |
| 858 | 857 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 859, 1097 |  |
| 859 | 858 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 860, 923 |  |
| 860 | 859 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 861, 1058 |  |
| 861 | 860 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 862, 1005 |  |
| 862 | 861 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 863, 991 |  |
| 863 | 862 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 864, 1021 |  |
| 864 | 863 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 865, 1101 |  |
| 865 | 864 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 866, 1000 |  |
| 866 | 865 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 867 |  |
| 867 | 866 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 868, 870 |  |
| 868 | 867 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 869, 1082 |  |
| 869 | 868 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1059 |  |
| 1059 | 869 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1082 | 868 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 870 | 867 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 871, 1030 |  |
| 871 | 870 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 872, 1125 |  |
| 872 | 871 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 873 |  |
| 873 | 872 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 874, 885 |  |
| 874 | 873 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 875 |  |
| 875 | 874 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 876 |  |
| 876 | 875 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 878 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 885 | 873 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 886, 1156 |  |
| 886 | 885 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 887, 1010 |  |
| 887 | 886 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 888, 1085 |  |
| 888 | 887 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 889, 1037 |  |
| 889 | 888 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 890, 996 |  |
| 890 | 889 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 891 |  |
| 891 | 890 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 892, 1117 |  |
| 892 | 891 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 893, 1024 |  |
| 893 | 892 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 894, 981 |  |
| 894 | 893 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 895, 1119 |  |
| 895 | 894 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 896, 908 |  |
| 896 | 895 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 897, 1051 |  |
| 897 | 896 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 898 |  |
| 898 | 897 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 899, 1062 |  |
| 899 | 898 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 900 |  |
| 900 | 899 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 901 |  |
| 901 | 900 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 | 902 |  |
| 902 | 901 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 980 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1062 | 898 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1063, 1072 |  |
| 1063 | 1062 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1064, 1092 |  |
| 1064 | 1063 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1065 |  |
| 1065 | 1064 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1136 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1137 |  |
| 1137 | 1136 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1092 | 1063 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1093 |  |
| 1093 | 1092 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1072 | 1062 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1073, 1143 |  |
| 1073 | 1072 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1074, 1114 |  |
| 1074 | 1073 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1075 |  |
| 1075 | 1074 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1114 | 1073 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1143 | 1072 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1051 | 896 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1052 |  |
| 1052 | 1051 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 908 | 895 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 909 |  |
| 909 | 908 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 910 |  |
| 910 | 909 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1119 | 894 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1120 |  |
| 1120 | 1119 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1155 |  |
| 1155 | 1120 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 981 | 893 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 982 |  |
| 982 | 981 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 983 |  |
| 983 | 982 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 985 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1024 | 892 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1025 |  |
| 1025 | 1024 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1026 |  |
| 1026 | 1025 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1028 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1029 |  |
| 1029 | 1028 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1117 | 891 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 |  |  |
| 996 | 889 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 997 |  |
| 997 | 996 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1133 |  |
| 1133 | 997 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1037 | 888 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1038 |  |
| 1038 | 1037 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1039 |  |
| 1039 | 1038 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1116 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1085 | 887 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1086 |  |
| 1086 | 1085 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1087 |  |
| 1087 | 1086 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1089 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1010 | 886 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1011 |  |
| 1011 | 1010 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1012 |  |
| 1012 | 1011 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1146 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1156 | 885 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1157 |  |
| 1157 | 1156 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1158 |  |
| 1158 | 1157 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1125 | 871 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1126 |  |
| 1126 | 1125 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1127 |  |
| 1127 | 1126 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1030 | 870 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1031 |  |
| 1031 | 1030 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1032 |  |
| 1032 | 1031 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1000 | 865 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 |  |  |
| 1101 | 864 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1123 |  |
| 1123 | 1101 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1124 |  |
| 1124 | 1123 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1021 | 863 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1022 |  |
| 1022 | 1021 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1023 |  |
| 1023 | 1022 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 991 | 862 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 992 |  |
| 992 | 991 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 993, 1091 |  |
| 993 | 992 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 995 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1091 | 992 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1005 | 861 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1006 |  |
| 1006 | 1005 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1007 |  |
| 1007 | 1006 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1009 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1058 | 860 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1083 |  |
| 1083 | 1058 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1084 |  |
| 1084 | 1083 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1122 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 923 | 859 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 924 |  |
| 924 | 923 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 925 |  |
| 925 | 924 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1097 | 858 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1098 |  |
| 1098 | 1097 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1099 |  |
| 1099 | 1098 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 986 | 857 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 987 |  |
| 987 | 986 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 988 |  |
| 988 | 987 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 990 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1040 | 856 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1041 |  |
| 1041 | 1040 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1042 |  |
| 1042 | 1041 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1044 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1045 |  |
| 1045 | 1044 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1094 | 855 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1095, 1144 |  |
| 1095 | 1094 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1096 |  |
| 1096 | 1095 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1144 | 1094 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 1102 | 854 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1103 |  |
| 1103 | 1102 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1104 |  |
| 1104 | 1103 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1106 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1053 | 853 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1054 |  |
| 1054 | 1053 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1055 |  |
| 1055 | 1054 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1057 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1128 | 852 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1129 |  |
| 1129 | 1128 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1130 |  |
| 1130 | 1129 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 | 1152 |  |
| 1132 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1152 | 1130 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 903 | 850 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 904 |  |
| 904 | 903 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 905 |  |
| 905 | 904 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 907 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 918 | 849 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 919 |  |
| 919 | 918 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 920 |  |
| 920 | 919 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 922 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1018 | 848 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1019, 1134 |  |
| 1019 | 1018 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1020, 1061 |  |
| 1020 | 1019 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1061 | 1019 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1134 | 1018 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1111 | 847 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1112 |  |
| 1112 | 1111 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1113 |  |
| 1113 | 1112 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1142 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1108 | 846 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1109 |  |
| 1109 | 1108 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1110 |  |
| 1110 | 1109 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1160 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 879 | 845 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 880 |  |
| 880 | 879 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 881 |  |
| 881 | 880 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 883 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 884 |  |
| 884 | 883 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1002 | 844 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1003 |  |
| 1003 | 1002 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1004 |  |
| 1004 | 1003 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1046 | 843 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1047 |  |
| 1047 | 1046 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1048 |  |
| 1048 | 1047 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1050 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1107 | 842 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1147 |  |
| 1147 | 1107 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1148 |  |
| 1148 | 1147 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1150 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1151 |  |
| 1151 | 1150 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 912 | 841 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 913 |  |
| 913 | 912 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 914 |  |
| 914 | 913 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 916 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 917 |  |
| 917 | 916 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1013 | 840 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1014 |  |
| 1014 | 1013 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1015 |  |
| 1015 | 1014 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1017 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1066 | 839 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1067, 1090 |  |
| 1067 | 1066 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1068 |  |
| 1068 | 1067 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1070 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1071 |  |
| 1071 | 1070 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1090 | 1066 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1001 | 838 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1118 |  |
| 1118 | 1001 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 1138 | 837 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 1139 |  |
| 1139 | 1138 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 928 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 929 |  |
| 929 | 928 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 930, 1034 |  |
| 930 | 929 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 931 |  |
| 931 | 930 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 932 |  |
| 932 | 931 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 933 |  |
| 933 | 932 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 934 |  |
| 934 | 933 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 935 |  |
| 935 | 934 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 936 |  |
| 936 | 935 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 937 |  |
| 937 | 936 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 938 |  |
| 938 | 937 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 939 |  |
| 939 | 938 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 940 |  |
| 940 | 939 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 941 |  |
| 941 | 940 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 942 |  |
| 942 | 941 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 943 |  |
| 943 | 942 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 944 |  |
| 944 | 943 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 945 |  |
| 945 | 944 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 946 |  |
| 946 | 945 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 947 |  |
| 947 | 946 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 948 |  |
| 948 | 947 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 949 |  |
| 949 | 948 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 950 |  |
| 950 | 949 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 951 |  |
| 951 | 950 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 952 |  |
| 952 | 951 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 953 |  |
| 953 | 952 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 954 |  |
| 954 | 953 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 955 |  |
| 955 | 954 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 956 |  |
| 956 | 955 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 957 |  |
| 957 | 956 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 958 |  |
| 958 | 957 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 959 |  |
| 959 | 958 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 960, 1153 |  |
| 960 | 959 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 961 |  |
| 961 | 960 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 962 |  |
| 962 | 961 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 963 |  |
| 963 | 962 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 964 |  |
| 964 | 963 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 965 |  |
| 965 | 964 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 966 |  |
| 966 | 965 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 967 |  |
| 967 | 966 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 968 |  |
| 968 | 967 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 969 |  |
| 969 | 968 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 970 |  |
| 970 | 969 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 971 |  |
| 971 | 970 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 972 |  |
| 972 | 971 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 973 |  |
| 973 | 972 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 974 |  |
| 974 | 973 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 975 |  |
| 975 | 974 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 976 |  |
| 976 | 975 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 977 |  |
| 977 | 976 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 978 |  |
| 978 | 977 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 998 |  |
| 998 | 978 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 999 |  |
| 999 | 998 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 1153 | 959 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1034 | 929 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 1035 |  |
| 1035 | 1034 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 1036 |  |
| 1036 | 1035 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 5 |  |  |
| 1077 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 1078 |  |
| 1078 | 1077 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 0 | 1079 |  |
| 1079 | 1078 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 1080 |  |
| 1080 | 1079 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 1081 |  |
| 1081 | 1080 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 7 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 8 |  |
| 8 | 7 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 9 |  |
| 9 | 8 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 10 |  |
| 10 | 9 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 12 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 13 |  |
| 13 | 12 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 14 |  |
| 14 | 13 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 15 |  |
| 15 | 14 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 17 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 18 |  |
| 18 | 17 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 19 |  |
| 19 | 18 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 20 |  |
| 20 | 19 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 22 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 23 |  |
| 23 | 22 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 24 |  |
| 24 | 23 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 25 |  |
| 25 | 24 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 27 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 28 |  |
| 28 | 27 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 29 |  |
| 29 | 28 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 30 |  |
| 30 | 29 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 32 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 33 |  |
| 33 | 32 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 34 |  |
| 34 | 33 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 35 |  |
| 35 | 34 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 37 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 38 |  |
| 38 | 37 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 39 |  |
| 39 | 38 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 40 |  |
| 40 | 39 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 42 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 43 |  |
| 43 | 42 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 44 |  |
| 44 | 43 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 45 |  |
| 45 | 44 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 47 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 48 |  |
| 48 | 47 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 49 |  |
| 49 | 48 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 50 |  |
| 50 | 49 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 52 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 53 |  |
| 53 | 52 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 54 |  |
| 54 | 53 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 55 |  |
| 55 | 54 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 57 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 58 |  |
| 58 | 57 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 59 |  |
| 59 | 58 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 60 |  |
| 60 | 59 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 62 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 63 |  |
| 63 | 62 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 64 |  |
| 64 | 63 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 65 |  |
| 65 | 64 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 67 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 68 |  |
| 68 | 67 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 69 |  |
| 69 | 68 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 70 |  |
| 70 | 69 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 72 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 73 |  |
| 73 | 72 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 74 |  |
| 74 | 73 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 75 |  |
| 75 | 74 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 77 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 78 |  |
| 78 | 77 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 79 |  |
| 79 | 78 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 80 |  |
| 80 | 79 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 82 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 83 |  |
| 83 | 82 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 84 |  |
| 84 | 83 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 85 |  |
| 85 | 84 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 87 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 88 |  |
| 88 | 87 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 89 |  |
| 89 | 88 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 90 |  |
| 90 | 89 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 92 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 93 |  |
| 93 | 92 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 94 |  |
| 94 | 93 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 95 |  |
| 95 | 94 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 97 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 98 |  |
| 98 | 97 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 99 |  |
| 99 | 98 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 100 |  |
| 100 | 99 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 102 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 103 |  |
| 103 | 102 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 104 |  |
| 104 | 103 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 105 |  |
| 105 | 104 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 107 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 108 |  |
| 108 | 107 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 109 |  |
| 109 | 108 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 110 |  |
| 110 | 109 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 112 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 113 |  |
| 113 | 112 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 114 |  |
| 114 | 113 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 115 |  |
| 115 | 114 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 117 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 118 |  |
| 118 | 117 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 119 |  |
| 119 | 118 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 120 |  |
| 120 | 119 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 122 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 123 |  |
| 123 | 122 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 124 |  |
| 124 | 123 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 125 |  |
| 125 | 124 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 127 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 128 |  |
| 128 | 127 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 129 |  |
| 129 | 128 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 130 |  |
| 130 | 129 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 132 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 133 |  |
| 133 | 132 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 134 |  |
| 134 | 133 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 135 |  |
| 135 | 134 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 137 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 138 |  |
| 138 | 137 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 139 |  |
| 139 | 138 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 140 |  |
| 140 | 139 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 142 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 143 |  |
| 143 | 142 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 144 |  |
| 144 | 143 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 145 |  |
| 145 | 144 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 147 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 148 |  |
| 148 | 147 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 149 |  |
| 149 | 148 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 150 |  |
| 150 | 149 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 152 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 153 |  |
| 153 | 152 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 154 |  |
| 154 | 153 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 155 |  |
| 155 | 154 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 157 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 158 |  |
| 158 | 157 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 159 |  |
| 159 | 158 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 160 |  |
| 160 | 159 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 162 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 163 |  |
| 163 | 162 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 164 |  |
| 164 | 163 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 165 |  |
| 165 | 164 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 167 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 168 |  |
| 168 | 167 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 169 |  |
| 169 | 168 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 170 |  |
| 170 | 169 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 172 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 173 |  |
| 173 | 172 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 174 |  |
| 174 | 173 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 175 |  |
| 175 | 174 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 177 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 178 |  |
| 178 | 177 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 179 |  |
| 179 | 178 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 180 |  |
| 180 | 179 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 182 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 183 |  |
| 183 | 182 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 184 |  |
| 184 | 183 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 185 |  |
| 185 | 184 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 187 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 188 |  |
| 188 | 187 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 189 |  |
| 189 | 188 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 190 |  |
| 190 | 189 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 192 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 193 |  |
| 193 | 192 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 194 |  |
| 194 | 193 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 195 |  |
| 195 | 194 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 197 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 198 |  |
| 198 | 197 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 199 |  |
| 199 | 198 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 200 |  |
| 200 | 199 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 202 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 203 |  |
| 203 | 202 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 204 |  |
| 204 | 203 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 205 |  |
| 205 | 204 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 207 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 208 |  |
| 208 | 207 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 209 |  |
| 209 | 208 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 210 |  |
| 210 | 209 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 212 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 213 |  |
| 213 | 212 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 214 |  |
| 214 | 213 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 215 |  |
| 215 | 214 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 217 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 218 |  |
| 218 | 217 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 219 |  |
| 219 | 218 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 220 |  |
| 220 | 219 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 222 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 223 |  |
| 223 | 222 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 224 |  |
| 224 | 223 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 225 |  |
| 225 | 224 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 227 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 228 |  |
| 228 | 227 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 229 |  |
| 229 | 228 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 230 |  |
| 230 | 229 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 232 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 233 |  |
| 233 | 232 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 234 |  |
| 234 | 233 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 235 |  |
| 235 | 234 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 237 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 238 |  |
| 238 | 237 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 239 |  |
| 239 | 238 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 240 |  |
| 240 | 239 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 242 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 243 |  |
| 243 | 242 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 244 |  |
| 244 | 243 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 245 |  |
| 245 | 244 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 247 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 248 |  |
| 248 | 247 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 249 |  |
| 249 | 248 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 250 |  |
| 250 | 249 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 252 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 253 |  |
| 253 | 252 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 254 |  |
| 254 | 253 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 255 |  |
| 255 | 254 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 257 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 258 |  |
| 258 | 257 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 259 |  |
| 259 | 258 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 260 |  |
| 260 | 259 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 262 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 263 |  |
| 263 | 262 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 264 |  |
| 264 | 263 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 265 |  |
| 265 | 264 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 267 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 268 |  |
| 268 | 267 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 269 |  |
| 269 | 268 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 270 |  |
| 270 | 269 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 272 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 273 |  |
| 273 | 272 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 274 |  |
| 274 | 273 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 275 |  |
| 275 | 274 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 277 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 278 |  |
| 278 | 277 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 279 |  |
| 279 | 278 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 280 |  |
| 280 | 279 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 282 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 283 |  |
| 283 | 282 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 284 |  |
| 284 | 283 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 285 |  |
| 285 | 284 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 287 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 288 |  |
| 288 | 287 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 289 |  |
| 289 | 288 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 290 |  |
| 290 | 289 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 292 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 293 |  |
| 293 | 292 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 294 |  |
| 294 | 293 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 295 |  |
| 295 | 294 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 297 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 298 |  |
| 298 | 297 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 299 |  |
| 299 | 298 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 300 |  |
| 300 | 299 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 302 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 303 |  |
| 303 | 302 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 304 |  |
| 304 | 303 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 305 |  |
| 305 | 304 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 307 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 308 |  |
| 308 | 307 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 309 |  |
| 309 | 308 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 310 |  |
| 310 | 309 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 312 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 313 |  |
| 313 | 312 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 314 |  |
| 314 | 313 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 315 |  |
| 315 | 314 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 317 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 318 |  |
| 318 | 317 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 319 |  |
| 319 | 318 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 320 |  |
| 320 | 319 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 322 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 323 |  |
| 323 | 322 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 324 |  |
| 324 | 323 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 325 |  |
| 325 | 324 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 327 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 328 |  |
| 328 | 327 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 329 |  |
| 329 | 328 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 330 |  |
| 330 | 329 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 332 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 333 |  |
| 333 | 332 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 334 |  |
| 334 | 333 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 335 |  |
| 335 | 334 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 337 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 338 |  |
| 338 | 337 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 339 |  |
| 339 | 338 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 340 |  |
| 340 | 339 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 342 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 343 |  |
| 343 | 342 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 344 |  |
| 344 | 343 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 345 |  |
| 345 | 344 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 347 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 348 |  |
| 348 | 347 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 349 |  |
| 349 | 348 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 350 |  |
| 350 | 349 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 352 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 353 |  |
| 353 | 352 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 354 |  |
| 354 | 353 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 355 |  |
| 355 | 354 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 357 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 358 |  |
| 358 | 357 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 359 |  |
| 359 | 358 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 360 |  |
| 360 | 359 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 362 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 363 |  |
| 363 | 362 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 364 |  |
| 364 | 363 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 365 |  |
| 365 | 364 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 367 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 368 |  |
| 368 | 367 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 369 |  |
| 369 | 368 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 370 |  |
| 370 | 369 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 372 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 373 |  |
| 373 | 372 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 374 |  |
| 374 | 373 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 375 |  |
| 375 | 374 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 377 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 378 |  |
| 378 | 377 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 379 |  |
| 379 | 378 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 380 |  |
| 380 | 379 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 382 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 383 |  |
| 383 | 382 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 384 |  |
| 384 | 383 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 385 |  |
| 385 | 384 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 387 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 388 |  |
| 388 | 387 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 389 |  |
| 389 | 388 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 390 |  |
| 390 | 389 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 392 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 393 |  |
| 393 | 392 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 394 |  |
| 394 | 393 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 395 |  |
| 395 | 394 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 397 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 398 |  |
| 398 | 397 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 399 |  |
| 399 | 398 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 400 |  |
| 400 | 399 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 402 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 403 |  |
| 403 | 402 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 404 |  |
| 404 | 403 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 405 |  |
| 405 | 404 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 407 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 408 |  |
| 408 | 407 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 409 |  |
| 409 | 408 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 410 |  |
| 410 | 409 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 412 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 413 |  |
| 413 | 412 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 414 |  |
| 414 | 413 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 415 |  |
| 415 | 414 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 417 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 418 |  |
| 418 | 417 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 419 |  |
| 419 | 418 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 420 |  |
| 420 | 419 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 422 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 423 |  |
| 423 | 422 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 424 |  |
| 424 | 423 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 425 |  |
| 425 | 424 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 427 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 428 |  |
| 428 | 427 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 429 |  |
| 429 | 428 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 430 |  |
| 430 | 429 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 432 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 433 |  |
| 433 | 432 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 434 |  |
| 434 | 433 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 435 |  |
| 435 | 434 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 437 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 438 |  |
| 438 | 437 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 439 |  |
| 439 | 438 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 440 |  |
| 440 | 439 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 442 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 443 |  |
| 443 | 442 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 444 |  |
| 444 | 443 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 445 |  |
| 445 | 444 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 447 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 448 |  |
| 448 | 447 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 449 |  |
| 449 | 448 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 450 |  |
| 450 | 449 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 452 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 453 |  |
| 453 | 452 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 454 |  |
| 454 | 453 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 455 |  |
| 455 | 454 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 457 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 458 |  |
| 458 | 457 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 459 |  |
| 459 | 458 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 460 |  |
| 460 | 459 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 462 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 463 |  |
| 463 | 462 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 464 |  |
| 464 | 463 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 465 |  |
| 465 | 464 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 467 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 468 |  |
| 468 | 467 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 469 |  |
| 469 | 468 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 470 |  |
| 470 | 469 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 472 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 473 |  |
| 473 | 472 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 474 |  |
| 474 | 473 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 475 |  |
| 475 | 474 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 477 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 478 |  |
| 478 | 477 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 479 |  |
| 479 | 478 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 480 |  |
| 480 | 479 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 482 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 483 |  |
| 483 | 482 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 484 |  |
| 484 | 483 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 485 |  |
| 485 | 484 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 487 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 488 |  |
| 488 | 487 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 489 |  |
| 489 | 488 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 490 |  |
| 490 | 489 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 492 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 493 |  |
| 493 | 492 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 494 |  |
| 494 | 493 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 495 |  |
| 495 | 494 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 497 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 498 |  |
| 498 | 497 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 499 |  |
| 499 | 498 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 500 |  |
| 500 | 499 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 502 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 503 |  |
| 503 | 502 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 504 |  |
| 504 | 503 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 505 |  |
| 505 | 504 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 507 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 508 |  |
| 508 | 507 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 509 |  |
| 509 | 508 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 510 |  |
| 510 | 509 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 512 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 513 |  |
| 513 | 512 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 514 |  |
| 514 | 513 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 515 |  |
| 515 | 514 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 829 |  | (garbage collector) |  | 0 | 0 | 43 |  |  |
| 1161 |  | (idle) |  | 0 | 0 | 93 |  |  |
| 1166 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 7 | 1185, 1564, 1639 |  |
| 1168 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 14 | 1169 |  |
| 1169 | 1168 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 16 | 1170, 1309, 1330 |  |
| 1170 | 1169 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 8 | 1171 |  |
| 1171 | 1170 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1172, 1581 |  |
| 1172 | 1171 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 1173 |  |
| 1173 | 1172 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1174 |  |
| 1174 | 1173 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1175 |  |
| 1175 | 1174 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1176 |  |
| 1176 | 1175 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1177 |  |
| 1177 | 1176 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1178, 1553 |  |
| 1178 | 1177 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1179, 1576 |  |
| 1179 | 1178 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1180 |  |
| 1180 | 1179 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1181 |  |
| 1181 | 1180 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1182 |  |
| 1182 | 1181 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1183 |  |
| 1183 | 1182 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1184 |  |
| 1184 | 1183 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1209, 1703 |  |
| 1209 | 1184 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1210 |  |
| 1210 | 1209 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1211 |  |
| 1211 | 1210 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1212 |  |
| 1212 | 1211 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1213, 1737 |  |
| 1213 | 1212 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1214, 1696 |  |
| 1214 | 1213 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1215, 1445, 1625 |  |
| 1215 | 1214 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1216 |  |
| 1216 | 1215 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1217, 1683 |  |
| 1217 | 1216 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 8 | 1218 |  |
| 1218 | 1217 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1219 |  |
| 1219 | 1218 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1220 |  |
| 1220 | 1219 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1221 |  |
| 1221 | 1220 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1222, 1658, 1678 |  |
| 1222 | 1221 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1223 |  |
| 1223 | 1222 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1224 |  |
| 1224 | 1223 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1225, 1345 |  |
| 1225 | 1224 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1226, 1665 |  |
| 1226 | 1225 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 1227, 1700 |  |
| 1227 | 1226 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1228, 1341, 1637 |  |
| 1228 | 1227 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1229 |  |
| 1229 | 1228 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1230, 1630 |  |
| 1230 | 1229 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 1231 |  |
| 1231 | 1230 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1232 |  |
| 1232 | 1231 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1233 |  |
| 1233 | 1232 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1381, 1634 |  |
| 1381 | 1233 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1382, 1661 |  |
| 1382 | 1381 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1383 |  |
| 1383 | 1382 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1384 |  |
| 1384 | 1383 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1385 |  |
| 1385 | 1384 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1386 |  |
| 1386 | 1385 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1387 |  |
| 1387 | 1386 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1388 |  |
| 1388 | 1387 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1389 |  |
| 1389 | 1388 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1456 |  |
| 1456 | 1389 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1457 |  |
| 1457 | 1456 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1458 |  |
| 1458 | 1457 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 1459 |  |
| 1459 | 1458 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 4 |  |  |
| 1661 | 1381 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1634 | 1233 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1630 | 1229 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1341 | 1227 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 1637 | 1227 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1700 | 1226 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1665 | 1225 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1345 | 1224 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1658 | 1221 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1678 | 1221 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1683 | 1216 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1445 | 1214 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1625 | 1214 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1696 | 1213 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1737 | 1212 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1703 | 1184 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1576 | 1178 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1553 | 1177 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1581 | 1171 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1309 | 1169 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 7 |  |  |
| 1330 | 1169 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 7 | 1331, 1466 |  |
| 1331 | 1330 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 5 | 1332 |  |
| 1332 | 1331 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 60 |  |  |
| 1466 | 1330 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 2 |  |  |
| 1185 | 1166 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 20 | 1186 |  |
| 1186 | 1185 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 42 | 1187, 1297, 1537, 1612, 1616, 1738 |  |
| 1187 | 1186 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 12 | 1188, 1328 |  |
| 1188 | 1187 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1189, 1417 |  |
| 1189 | 1188 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1190, 1478, 1743 |  |
| 1190 | 1189 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1191, 1409 |  |
| 1191 | 1190 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1192, 1346 |  |
| 1192 | 1191 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1193, 1234 |  |
| 1193 | 1192 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1194, 1358 |  |
| 1194 | 1193 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1195, 1304 |  |
| 1195 | 1194 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1196, 1554 |  |
| 1196 | 1195 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 1197, 1313 |  |
| 1197 | 1196 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1198, 1390 |  |
| 1198 | 1197 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1199, 1518 |  |
| 1199 | 1198 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1200, 1372 |  |
| 1200 | 1199 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1201, 1399 |  |
| 1201 | 1200 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1202, 1236 |  |
| 1202 | 1201 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1203, 1242 |  |
| 1203 | 1202 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 4 | 1204 |  |
| 1204 | 1203 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1205, 1685 |  |
| 1205 | 1204 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 | 1624 |  |
| 1207 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1208 |  |
| 1208 | 1207 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1624 | 1205 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1685 | 1204 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1242 | 1202 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1243, 1403, 1632 |  |
| 1243 | 1242 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1244, 1547 |  |
| 1244 | 1243 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1245, 1361 |  |
| 1245 | 1244 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1246, 1272 |  |
| 1246 | 1245 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1247, 1293, 1337 |  |
| 1247 | 1246 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1248, 1354 |  |
| 1248 | 1247 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1249, 1366 |  |
| 1249 | 1248 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1250, 1310 |  |
| 1250 | 1249 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1251, 1396 |  |
| 1251 | 1250 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1252, 1284 |  |
| 1252 | 1251 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1253, 1318, 1433 |  |
| 1253 | 1252 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1254, 1324 |  |
| 1254 | 1253 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1255, 1349 |  |
| 1255 | 1254 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1256, 1316 |  |
| 1256 | 1255 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1257, 1450, 1599 |  |
| 1257 | 1256 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1258, 1294 |  |
| 1258 | 1257 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1259, 1517 |  |
| 1259 | 1258 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1260, 1275 |  |
| 1260 | 1259 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1261, 1283 |  |
| 1261 | 1260 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1262, 1407 |  |
| 1262 | 1261 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1263, 1573 |  |
| 1263 | 1262 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1264, 1351 |  |
| 1264 | 1263 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1265, 1436 |  |
| 1265 | 1264 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1266, 1322 |  |
| 1266 | 1265 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1267, 1369 |  |
| 1267 | 1266 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1268, 1288 |  |
| 1268 | 1267 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1269, 1278 |  |
| 1269 | 1268 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 1270, 1674 |  |
| 1270 | 1269 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 8 | 1271 |  |
| 1271 | 1270 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1475 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 | 1568 |  |
| 1568 | 1475 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 1674 | 1269 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1278 | 1268 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1279, 1453 |  |
| 1279 | 1278 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1280, 1298 |  |
| 1280 | 1279 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1281, 1653, 1684 |  |
| 1281 | 1280 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1282, 1740 |  |
| 1282 | 1281 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1676 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1740 | 1281 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1653 | 1280 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1654 |  |
| 1654 | 1653 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1684 | 1280 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1298 | 1279 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1299, 1462 |  |
| 1299 | 1298 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1300, 1486, 1618 |  |
| 1300 | 1299 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1301, 1440 |  |
| 1301 | 1300 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1302, 1427 |  |
| 1302 | 1301 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1303, 1376 |  |
| 1303 | 1302 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 1342, 1572 |  |
| 1342 | 1303 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 7 | 1343, 1353 |  |
| 1343 | 1342 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1344 |  |
| 1344 | 1343 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1353 | 1342 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 7 | 1357 |  |
| 1357 | 1353 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 9 |  |  |
| 1651 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1572 | 1303 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1376 | 1302 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1377, 1425, 1622 |  |
| 1377 | 1376 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1378, 1656 |  |
| 1378 | 1377 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 11 | 1590 |  |
| 1380 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 10 |  |  |
| 1590 | 1378 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1656 | 1377 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1425 | 1376 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1426 |  |
| 1426 | 1425 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 1622 | 1376 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1427 | 1301 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1428 |  |
| 1428 | 1427 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1429 |  |
| 1429 | 1428 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1432 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1663 |  |
| 1663 | 1432 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 1440 | 1300 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 1441, 1699 |  |
| 1441 | 1440 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1442 |  |
| 1442 | 1441 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 11 | 1739 |  |
| 1580 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 |  |  |
| 1739 | 1442 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1699 | 1440 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1486 | 1299 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1487 |  |
| 1487 | 1486 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1488 |  |
| 1488 | 1487 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1490 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1618 | 1299 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1462 | 1298 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1463, 1491, 1603 |  |
| 1463 | 1462 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1464, 1646 |  |
| 1464 | 1463 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 | 1657 |  |
| 1662 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 1695 |  |
| 1695 | 1662 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1657 | 1464 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1646 | 1463 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1491 | 1462 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 |  |  |
| 1603 | 1462 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1453 | 1278 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1454 |  |
| 1454 | 1453 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1536 |  |
| 1536 | 1454 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 1621 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1288 | 1267 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1289, 1586 |  |
| 1289 | 1288 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 1290, 1638 |  |
| 1290 | 1289 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 | 1689 |  |
| 1292 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 | 1742 |  |
| 1742 | 1292 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1689 | 1290 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1638 | 1289 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1586 | 1288 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1369 | 1266 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1370, 1681 |  |
| 1370 | 1369 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1371, 1535 |  |
| 1371 | 1370 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 8 |  |  |
| 1585 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1535 | 1370 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 4 |  |  |
| 1681 | 1369 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1682 |  |
| 1682 | 1681 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1322 | 1265 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1323, 1635 |  |
| 1323 | 1322 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1552, 1595 |  |
| 1552 | 1323 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1608 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1595 | 1323 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1635 | 1322 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1436 | 1264 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1437, 1698 |  |
| 1437 | 1436 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1438, 1673 |  |
| 1438 | 1437 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 | 1680 |  |
| 1468 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1469 |  |
| 1469 | 1468 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1680 | 1438 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1673 | 1437 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1698 | 1436 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 |  |  |
| 1351 | 1263 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1365, 1679 |  |
| 1365 | 1351 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1482 |  |
| 1482 | 1365 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1484 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1485 |  |
| 1485 | 1484 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 1679 | 1351 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1573 | 1262 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1574, 1609, 1648 |  |
| 1574 | 1573 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1575 |  |
| 1575 | 1574 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 11 |  |  |
| 1649 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1686 |  |
| 1686 | 1649 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1609 | 1573 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1610 |  |
| 1610 | 1609 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1648 | 1573 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 1407 | 1261 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1408, 1431 |  |
| 1408 | 1407 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1421, 1672 |  |
| 1421 | 1408 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 | 1422 |  |
| 1422 | 1421 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1570 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1571 |  |
| 1571 | 1570 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1672 | 1408 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1431 | 1407 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1283 | 1260 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1461, 1670 |  |
| 1461 | 1283 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1471, 1593 |  |
| 1471 | 1461 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 1473 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 | 1591 |  |
| 1591 | 1473 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1593 | 1461 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1670 | 1283 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1671 |  |
| 1671 | 1670 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1275 | 1259 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1276, 1664, 1667 |  |
| 1276 | 1275 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 1277 |  |
| 1277 | 1276 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 11 |  |  |
| 1602 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1664 | 1275 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1667 | 1275 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 |  |  |
| 1517 | 1258 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1545 |  |
| 1545 | 1517 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1546 |  |
| 1546 | 1545 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 10 |  |  |
| 1566 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1567 |  |
| 1567 | 1566 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 1294 | 1257 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1295, 1691 |  |
| 1295 | 1294 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1296 |  |
| 1296 | 1295 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1540 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1691 | 1294 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1450 | 1256 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1556 |  |
| 1556 | 1450 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1557 |  |
| 1557 | 1556 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 8 |  |  |
| 1560 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1736 |  |
| 1736 | 1560 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1599 | 1256 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1316 | 1255 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1317 |  |
| 1317 | 1316 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 1414 |  |
| 1414 | 1317 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 9 |  |  |
| 1416 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1690 |  |
| 1690 | 1416 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1349 | 1254 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1350, 1592, 1669 |  |
| 1350 | 1349 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 1480, 1600, 1668 |  |
| 1480 | 1350 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 | 1481 |  |
| 1481 | 1480 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1563 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 1692 |  |
| 1692 | 1563 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1600 | 1350 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 1668 | 1350 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1592 | 1349 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 1669 | 1349 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1324 | 1253 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1325, 1434 |  |
| 1325 | 1324 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1326 |  |
| 1326 | 1325 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 9 | 1470 |  |
| 1619 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 |  |  |
| 1470 | 1326 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1434 | 1324 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1435 |  |
| 1435 | 1434 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1318 | 1252 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1319 |  |
| 1319 | 1318 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1320 |  |
| 1320 | 1319 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 | 1321 |  |
| 1321 | 1320 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 2 |  |  |
| 1606 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1611 |  |
| 1611 | 1606 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1433 | 1252 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1284 | 1251 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1285, 1334 |  |
| 1285 | 1284 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1286 |  |
| 1286 | 1285 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1578 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 7 |  |  |
| 1334 | 1284 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1396 | 1250 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1397 |  |
| 1397 | 1396 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1398, 1659 |  |
| 1398 | 1397 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1583 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1584 |  |
| 1584 | 1583 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1659 | 1397 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 1310 | 1249 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1311, 1402, 1704 |  |
| 1311 | 1310 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1312, 1333 |  |
| 1312 | 1311 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1333 | 1311 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 1406 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1402 | 1310 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 | 1693 |  |
| 1693 | 1402 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1704 | 1310 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 1366 | 1248 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1367, 1423 |  |
| 1367 | 1366 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1368, 1587 |  |
| 1368 | 1367 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1587 | 1367 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 1628 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1741 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1423 | 1366 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1424 |  |
| 1424 | 1423 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1354 | 1247 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1355 |  |
| 1355 | 1354 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1356 |  |
| 1356 | 1355 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 8 |  |  |
| 1477 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1293 | 1246 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1337 | 1246 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1338 |  |
| 1338 | 1337 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1339 |  |
| 1339 | 1338 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 9 |  |  |
| 1521 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 | 1522 |  |
| 1522 | 1521 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 1272 | 1245 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1273, 1364 |  |
| 1273 | 1272 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1274 |  |
| 1274 | 1273 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1614 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 1615 |  |
| 1615 | 1614 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1364 | 1272 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1361 | 1244 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1362, 1694, 1701 |  |
| 1362 | 1361 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 1363 |  |
| 1363 | 1362 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1452 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1636 |  |
| 1636 | 1452 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 1694 | 1361 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1701 | 1361 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1702 |  |
| 1702 | 1701 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1547 | 1243 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1548 |  |
| 1548 | 1547 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1549, 1688 |  |
| 1549 | 1548 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1551 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1688 | 1548 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1403 | 1242 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1404, 1677 |  |
| 1404 | 1403 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1523 |  |
| 1523 | 1404 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1525 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1631 |  |
| 1631 | 1525 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1677 | 1403 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1632 | 1242 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1236 | 1201 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1237, 1645 |  |
| 1237 | 1236 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 8 | 1238 |  |
| 1238 | 1237 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 9 |  |  |
| 1240 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 | 1241 |  |
| 1241 | 1240 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1645 | 1236 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1399 | 1200 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1400, 1660 |  |
| 1400 | 1399 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 1401, 1558 |  |
| 1401 | 1400 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1533 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1647 |  |
| 1647 | 1533 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1558 | 1400 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1660 | 1399 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 1372 | 1199 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1373, 1439 |  |
| 1373 | 1372 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1374 |  |
| 1374 | 1373 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 1515 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 7 | 1516 |  |
| 1516 | 1515 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1439 | 1372 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1518 | 1198 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1519 |  |
| 1519 | 1518 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 1588 |  |
| 1588 | 1519 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1604 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1390 | 1197 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1391 |  |
| 1391 | 1390 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1392 |  |
| 1392 | 1391 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 | 1596 |  |
| 1596 | 1392 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1629 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1313 | 1196 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1314, 1666 |  |
| 1314 | 1313 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1315, 1643 |  |
| 1315 | 1314 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1444 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1652 |  |
| 1652 | 1444 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1643 | 1314 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1666 | 1313 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1554 | 1195 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1555 |  |
| 1555 | 1554 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 1597 |  |
| 1597 | 1555 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 | 1655 |  |
| 1687 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1655 | 1597 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1304 | 1194 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1305, 1650 |  |
| 1305 | 1304 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1306 |  |
| 1306 | 1305 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 | 1644 |  |
| 1308 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1744 |  |
| 1744 | 1308 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1644 | 1306 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1650 | 1304 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1358 | 1193 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1359, 1460 |  |
| 1359 | 1358 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1360 |  |
| 1360 | 1359 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1394 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1395 |  |
| 1395 | 1394 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1460 | 1358 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 |  |  |
| 1234 | 1192 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1235 |  |
| 1235 | 1234 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 1340 |  |
| 1340 | 1235 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1527 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1528 |  |
| 1528 | 1527 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1346 | 1191 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1347 |  |
| 1347 | 1346 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1348 |  |
| 1348 | 1347 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 | 1640 |  |
| 1447 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 |  |  |
| 1640 | 1348 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 3 |  |  |
| 1409 | 1190 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1410, 1577 |  |
| 1410 | 1409 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1411 |  |
| 1411 | 1410 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 1413 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 6 |  |  |
| 1577 | 1409 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 |  |  |
| 1478 | 1189 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1479 |  |
| 1479 | 1478 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1529, 1697 |  |
| 1529 | 1479 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 | 1623 |  |
| 1531 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1541 |  |
| 1541 | 1531 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1623 | 1529 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1697 | 1479 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1743 | 1189 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1417 | 1188 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1418 |  |
| 1418 | 1417 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1419 |  |
| 1419 | 1418 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 | 1642 |  |
| 1448 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1449 |  |
| 1449 | 1448 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1642 | 1419 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1328 | 1187 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 5 | 1329 |  |
| 1329 | 1328 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 11 |  |  |
| 1336 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 7 | 1542 |  |
| 1542 | 1336 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1297 | 1186 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 6 |  |  |
| 1537 | 1186 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 1 | 1538 |  |
| 1538 | 1537 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 1612 | 1186 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 1616 | 1186 | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 2 |  |  |
| 1738 | 1186 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 1 |  |  |
| 1493 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 1494 |  |
| 1494 | 1493 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 1495, 1641 |  |
| 1495 | 1494 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1496 |  |
| 1496 | 1495 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1497 |  |
| 1497 | 1496 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1498 |  |
| 1498 | 1497 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1499 |  |
| 1499 | 1498 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1500 |  |
| 1500 | 1499 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1501 |  |
| 1501 | 1500 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1502 |  |
| 1502 | 1501 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1503 |  |
| 1503 | 1502 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1504 |  |
| 1504 | 1503 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1505 |  |
| 1505 | 1504 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1506 |  |
| 1506 | 1505 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1507 |  |
| 1507 | 1506 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1508 |  |
| 1508 | 1507 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1509 |  |
| 1509 | 1508 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1510 |  |
| 1510 | 1509 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1511 |  |
| 1511 | 1510 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1512 |  |
| 1512 | 1511 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1513 |  |
| 1513 | 1512 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1514 |  |
| 1514 | 1513 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1705 |  |
| 1705 | 1514 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1706 |  |
| 1706 | 1705 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1707 |  |
| 1707 | 1706 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1708 |  |
| 1708 | 1707 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1709 |  |
| 1709 | 1708 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1710 |  |
| 1710 | 1709 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1711 |  |
| 1711 | 1710 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1712 |  |
| 1712 | 1711 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1713 |  |
| 1713 | 1712 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1714 |  |
| 1714 | 1713 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1715 |  |
| 1715 | 1714 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1716 |  |
| 1716 | 1715 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1717 |  |
| 1717 | 1716 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1718 |  |
| 1718 | 1717 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1719 |  |
| 1719 | 1718 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1720 |  |
| 1720 | 1719 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1721 |  |
| 1721 | 1720 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1722 |  |
| 1722 | 1721 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1723 |  |
| 1723 | 1722 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1724 |  |
| 1724 | 1723 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1725 |  |
| 1725 | 1724 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1726 |  |
| 1726 | 1725 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1727 |  |
| 1727 | 1726 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1728 |  |
| 1728 | 1727 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1729 |  |
| 1729 | 1728 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1730 |  |
| 1730 | 1729 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1731 |  |
| 1731 | 1730 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1732 |  |
| 1732 | 1731 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1733 |  |
| 1733 | 1732 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1734 |  |
| 1734 | 1733 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1735 |  |
| 1735 | 1734 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 1641 | 1494 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 1564 | 1166 | flush_tasks | packages/svelte/src/internal/client/dom/task.js | 38 | 28 | 2 |  |  |
| 1639 | 1166 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 |  |  |
| 1352 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1617 |  |
| 1617 | 1352 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1543 |  | apply | packages/svelte/src/internal/client/reactivity/batch.js | 842 | 8 | 1 |  |  |
| 1633 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
