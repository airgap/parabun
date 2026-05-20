# CPU profile

## Metadata
| Field | Value |
| --- | --- |
| startTime | 482438135820 |
| endTime | 482440128005 |

## Top hotspots
| Rank | Node ID | Function | Self samples | Self % | Inclusive samples | Inclusive % |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1401 | flushSync | 6 | 0.33% | 1418 | 78.82% |
| 2 | 1402 | flush | 26 | 1.45% | 1102 | 61.26% |
| 3 | 1403 | #process | 43 | 2.39% | 1076 | 59.81% |
| 4 | 1404 | flush_queued_effects | 19 | 1.06% | 1020 | 56.70% |
| 5 | 1405 | is_dirty | 6 | 0.33% | 985 | 54.75% |
| 6 | 1406 | is_dirty | 4 | 0.22% | 961 | 53.42% |
| 7 | 1407 | is_dirty | 4 | 0.22% | 942 | 52.36% |
| 8 | 1408 | is_dirty | 4 | 0.22% | 925 | 51.42% |
| 9 | 1409 | is_dirty | 5 | 0.28% | 902 | 50.14% |
| 10 | 1410 | is_dirty | 7 | 0.39% | 873 | 48.53% |
| 11 | 1411 | is_dirty | 5 | 0.28% | 853 | 47.42% |
| 12 | 1412 | is_dirty | 2 | 0.11% | 833 | 46.30% |
| 13 | 1413 | is_dirty | 3 | 0.17% | 815 | 45.30% |
| 14 | 1414 | is_dirty | 6 | 0.33% | 794 | 44.14% |
| 15 | 1415 | is_dirty | 7 | 0.39% | 779 | 43.30% |
| 16 | 1416 | is_dirty | 3 | 0.17% | 751 | 41.75% |
| 17 | 1417 | is_dirty | 3 | 0.17% | 733 | 40.74% |
| 18 | 1418 | is_dirty | 1 | 0.06% | 714 | 39.69% |
| 19 | 1419 | is_dirty | 3 | 0.17% | 696 | 38.69% |
| 20 | 1420 | is_dirty | 7 | 0.39% | 675 | 37.52% |
| 21 | 1421 | is_dirty | 1 | 0.06% | 659 | 36.63% |
| 22 | 1422 | is_dirty | 5 | 0.28% | 635 | 35.30% |
| 23 | 1423 | is_dirty | 3 | 0.17% | 613 | 34.07% |
| 24 | 1424 | is_dirty | 0 | 0.00% | 599 | 33.30% |
| 25 | 1425 | is_dirty | 4 | 0.22% | 587 | 32.63% |

## Nodes
| ID | Parent ID | Function | URL | Line | Column | Hit count | Children | Deopt reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 773 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 774 |  |
| 774 | 773 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 775 |  |
| 775 | 774 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 776 |  |
| 776 | 775 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 779 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 780 |  |
| 780 | 779 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 781 |  |
| 781 | 780 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 782 |  |
| 782 | 781 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 784 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 785 |  |
| 785 | 784 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 786 |  |
| 786 | 785 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 787 |  |
| 787 | 786 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 789 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 790 |  |
| 790 | 789 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 791 |  |
| 791 | 790 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 792 |  |
| 792 | 791 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 794 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 795 |  |
| 795 | 794 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 796 |  |
| 796 | 795 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 797 |  |
| 797 | 796 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 799 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 800 |  |
| 800 | 799 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 801 |  |
| 801 | 800 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 802 |  |
| 802 | 801 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 804 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 805 |  |
| 805 | 804 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 806 |  |
| 806 | 805 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 807 |  |
| 807 | 806 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 809 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 810 |  |
| 810 | 809 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 811 |  |
| 811 | 810 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 812 |  |
| 812 | 811 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 814 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 815 |  |
| 815 | 814 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 816 |  |
| 816 | 815 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 817 |  |
| 817 | 816 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 819 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 820 |  |
| 820 | 819 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 821 |  |
| 821 | 820 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 822 |  |
| 822 | 821 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 824 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 825 |  |
| 825 | 824 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 826 |  |
| 826 | 825 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 827 |  |
| 827 | 826 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 829 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 830 |  |
| 830 | 829 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 831 |  |
| 831 | 830 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 832 |  |
| 832 | 831 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 834 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 835 |  |
| 835 | 834 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 836 |  |
| 836 | 835 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 837 |  |
| 837 | 836 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 839 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 840 |  |
| 840 | 839 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 841 |  |
| 841 | 840 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 842 |  |
| 842 | 841 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 844 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 845 |  |
| 845 | 844 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 846 |  |
| 846 | 845 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 847 |  |
| 847 | 846 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 849 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 850 |  |
| 850 | 849 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 851 |  |
| 851 | 850 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 852 |  |
| 852 | 851 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 854 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 855 |  |
| 855 | 854 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 856 |  |
| 856 | 855 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 857 |  |
| 857 | 856 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 859 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 860 |  |
| 860 | 859 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 861 |  |
| 861 | 860 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 862 |  |
| 862 | 861 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 864 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 865 |  |
| 865 | 864 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 866 |  |
| 866 | 865 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 867 |  |
| 867 | 866 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 869 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 870 |  |
| 870 | 869 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 871 |  |
| 871 | 870 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 872 |  |
| 872 | 871 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 874 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 875 |  |
| 875 | 874 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 876 |  |
| 876 | 875 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 877 |  |
| 877 | 876 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 879 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 880 |  |
| 880 | 879 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 881 |  |
| 881 | 880 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 882 |  |
| 882 | 881 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 884 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 885 |  |
| 885 | 884 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 886 |  |
| 886 | 885 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 887 |  |
| 887 | 886 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 889 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 890 |  |
| 890 | 889 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 891 |  |
| 891 | 890 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 892 |  |
| 892 | 891 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 894 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 895 |  |
| 895 | 894 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 896 |  |
| 896 | 895 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 897 |  |
| 897 | 896 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 899 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 900 |  |
| 900 | 899 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 901 |  |
| 901 | 900 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 902 |  |
| 902 | 901 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 904 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 905 |  |
| 905 | 904 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 906 |  |
| 906 | 905 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 907 |  |
| 907 | 906 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 909 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 910 |  |
| 910 | 909 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 911 |  |
| 911 | 910 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 912 |  |
| 912 | 911 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 914 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 915 |  |
| 915 | 914 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 916 |  |
| 916 | 915 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 917 |  |
| 917 | 916 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 919 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 920 |  |
| 920 | 919 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 921 |  |
| 921 | 920 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 922 |  |
| 922 | 921 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 924 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 925 |  |
| 925 | 924 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 926 |  |
| 926 | 925 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 927 |  |
| 927 | 926 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 929 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 930 |  |
| 930 | 929 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 931 |  |
| 931 | 930 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 932 |  |
| 932 | 931 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 934 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 935 |  |
| 935 | 934 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 936 |  |
| 936 | 935 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 937 |  |
| 937 | 936 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 939 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 940 |  |
| 940 | 939 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 941 |  |
| 941 | 940 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 942 |  |
| 942 | 941 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 944 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 945 |  |
| 945 | 944 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 946 |  |
| 946 | 945 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 947 |  |
| 947 | 946 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 949 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 950 |  |
| 950 | 949 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 951 |  |
| 951 | 950 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 952 |  |
| 952 | 951 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 954 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 955 |  |
| 955 | 954 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 956 |  |
| 956 | 955 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 957 |  |
| 957 | 956 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 959 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 960 |  |
| 960 | 959 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 961 |  |
| 961 | 960 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 962 |  |
| 962 | 961 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 964 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 965 |  |
| 965 | 964 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 966 |  |
| 966 | 965 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 967 |  |
| 967 | 966 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 969 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 970 |  |
| 970 | 969 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 971 |  |
| 971 | 970 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 972 |  |
| 972 | 971 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 974 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 975 |  |
| 975 | 974 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 976 |  |
| 976 | 975 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 977 |  |
| 977 | 976 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 979 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 980 |  |
| 980 | 979 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 981 |  |
| 981 | 980 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 982 |  |
| 982 | 981 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 984 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 985 |  |
| 985 | 984 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 986 |  |
| 986 | 985 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 987 |  |
| 987 | 986 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 989 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 990 |  |
| 990 | 989 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 991 |  |
| 991 | 990 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 992 |  |
| 992 | 991 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 994 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 995 |  |
| 995 | 994 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 996 |  |
| 996 | 995 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 997 |  |
| 997 | 996 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 999 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1000 |  |
| 1000 | 999 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1001 |  |
| 1001 | 1000 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1002 |  |
| 1002 | 1001 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1004 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1005 |  |
| 1005 | 1004 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1006 |  |
| 1006 | 1005 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1007 |  |
| 1007 | 1006 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1009 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1010 |  |
| 1010 | 1009 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1011 |  |
| 1011 | 1010 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1012 |  |
| 1012 | 1011 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1014 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1015 |  |
| 1015 | 1014 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1016 |  |
| 1016 | 1015 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1017 |  |
| 1017 | 1016 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1019 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1020 |  |
| 1020 | 1019 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1021 |  |
| 1021 | 1020 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1022 |  |
| 1022 | 1021 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1024 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 1025 |  |
| 1025 | 1024 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 0 | 1026 |  |
| 1026 | 1025 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 0 | 1027 |  |
| 1027 | 1026 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 1028 |  |
| 1028 | 1027 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1029 |  |
| 1029 | 1028 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1030 |  |
| 1030 | 1029 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1031 |  |
| 1031 | 1030 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1032 |  |
| 1032 | 1031 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1033, 1035 |  |
| 1033 | 1032 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1034 |  |
| 1034 | 1033 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 1035 | 1032 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1036 |  |
| 1036 | 1035 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1037 |  |
| 1037 | 1036 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1038 |  |
| 1038 | 1037 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1039 |  |
| 1039 | 1038 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1040 |  |
| 1040 | 1039 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1041 |  |
| 1041 | 1040 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1042 |  |
| 1042 | 1041 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1043 |  |
| 1043 | 1042 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1044 |  |
| 1044 | 1043 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1045, 1055 |  |
| 1045 | 1044 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1046 |  |
| 1046 | 1045 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1047 |  |
| 1047 | 1046 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1048 |  |
| 1048 | 1047 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1049 |  |
| 1049 | 1048 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1050 |  |
| 1050 | 1049 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1051 |  |
| 1051 | 1050 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1052 |  |
| 1052 | 1051 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1053 |  |
| 1053 | 1052 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1054 |  |
| 1054 | 1053 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1055 | 1044 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1056 |  |
| 1056 | 1055 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1057 |  |
| 1057 | 1056 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1063 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 0 | 1116 |  |
| 1065 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 1066 |  |
| 1066 | 1065 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 1067, 1198, 1395 |  |
| 1067 | 1066 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1068 |  |
| 1068 | 1067 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1069 |  |
| 1069 | 1068 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1070 |  |
| 1070 | 1069 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1071 |  |
| 1071 | 1070 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1072 |  |
| 1072 | 1071 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1073 |  |
| 1073 | 1072 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1074 |  |
| 1074 | 1073 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1075 |  |
| 1075 | 1074 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1076 |  |
| 1076 | 1075 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1077 |  |
| 1077 | 1076 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1078 |  |
| 1078 | 1077 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1079 |  |
| 1079 | 1078 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1080 |  |
| 1080 | 1079 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1081 |  |
| 1081 | 1080 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1082 |  |
| 1082 | 1081 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1083 |  |
| 1083 | 1082 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1084 |  |
| 1084 | 1083 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1085 |  |
| 1085 | 1084 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1086 |  |
| 1086 | 1085 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1087 |  |
| 1087 | 1086 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1088 |  |
| 1088 | 1087 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1089 |  |
| 1089 | 1088 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1090 |  |
| 1090 | 1089 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1091 |  |
| 1091 | 1090 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1092 |  |
| 1092 | 1091 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1093 |  |
| 1093 | 1092 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1094 |  |
| 1094 | 1093 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1095 |  |
| 1095 | 1094 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1096 |  |
| 1096 | 1095 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1097 |  |
| 1097 | 1096 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1098 |  |
| 1098 | 1097 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1099 |  |
| 1099 | 1098 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1100 |  |
| 1100 | 1099 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1101 |  |
| 1101 | 1100 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1102 |  |
| 1102 | 1101 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1103 |  |
| 1103 | 1102 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1104 |  |
| 1104 | 1103 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1105 |  |
| 1105 | 1104 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1106 |  |
| 1106 | 1105 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1107 |  |
| 1107 | 1106 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1108 |  |
| 1108 | 1107 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1109 |  |
| 1109 | 1108 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1110 |  |
| 1110 | 1109 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1111 |  |
| 1111 | 1110 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1112 |  |
| 1112 | 1111 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1113 |  |
| 1113 | 1112 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1114 |  |
| 1114 | 1113 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1115 |  |
| 1115 | 1114 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1228 |  |
| 1228 | 1115 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1229 |  |
| 1229 | 1228 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1230 |  |
| 1230 | 1229 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 1231 |  |
| 1231 | 1230 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 4 |  |  |
| 1198 | 1066 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 1199 |  |
| 1199 | 1198 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 1200 |  |
| 1200 | 1199 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 8 |  |  |
| 1395 | 1066 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 1 |  |  |
| 1116 | 1063 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 1 | 1117 |  |
| 1117 | 1116 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 2 | 1118, 1232, 1270 |  |
| 1118 | 1117 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 0 | 1119, 1282 |  |
| 1119 | 1118 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1120 |  |
| 1120 | 1119 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1121, 1257 |  |
| 1121 | 1120 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1122, 1354 |  |
| 1122 | 1121 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1123, 1211 |  |
| 1123 | 1122 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1124, 1152 |  |
| 1124 | 1123 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1125, 1216 |  |
| 1125 | 1124 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1126, 1251 |  |
| 1126 | 1125 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1127, 1316 |  |
| 1127 | 1126 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1128, 1206 |  |
| 1128 | 1127 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1129, 1263 |  |
| 1129 | 1128 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1130, 1319 |  |
| 1130 | 1129 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1131, 1157 |  |
| 1131 | 1130 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1132 |  |
| 1132 | 1131 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1133, 1351 |  |
| 1133 | 1132 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1134, 1197 |  |
| 1134 | 1133 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1135, 1245 |  |
| 1135 | 1134 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1136, 1299 |  |
| 1136 | 1135 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1137, 1322 |  |
| 1137 | 1136 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1138, 1239 |  |
| 1138 | 1137 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1139, 1162 |  |
| 1139 | 1138 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1140, 1347 |  |
| 1140 | 1139 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1141, 1372 |  |
| 1141 | 1140 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1142, 1272 |  |
| 1142 | 1141 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1143, 1369 |  |
| 1143 | 1142 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1144, 1307 |  |
| 1144 | 1143 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1145, 1333 |  |
| 1145 | 1144 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1146, 1175 |  |
| 1146 | 1145 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1147, 1222 |  |
| 1147 | 1146 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1148, 1318 |  |
| 1148 | 1147 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1149, 1168 |  |
| 1149 | 1148 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1150 |  |
| 1150 | 1149 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1151 |  |
| 1151 | 1150 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1168 | 1148 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1169, 1302 |  |
| 1169 | 1168 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1170, 1311 |  |
| 1170 | 1169 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1171, 1180 |  |
| 1171 | 1170 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1172 |  |
| 1172 | 1171 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1173 |  |
| 1173 | 1172 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1366 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 1377 |  |
| 1377 | 1366 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1180 | 1170 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1181, 1242 |  |
| 1181 | 1180 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1182, 1233 |  |
| 1182 | 1181 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1183, 1293 |  |
| 1183 | 1182 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1184, 1288 |  |
| 1184 | 1183 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1185, 1390 |  |
| 1185 | 1184 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1186, 1362 |  |
| 1186 | 1185 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1187 |  |
| 1187 | 1186 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1188 |  |
| 1188 | 1187 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1189, 1384 |  |
| 1189 | 1188 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1190, 1277 |  |
| 1190 | 1189 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1191, 1331 |  |
| 1191 | 1190 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1192, 1235 |  |
| 1192 | 1191 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1193, 1225 |  |
| 1193 | 1192 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1194, 1247 |  |
| 1194 | 1193 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1195 |  |
| 1195 | 1194 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1196 |  |
| 1196 | 1195 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 1247 | 1193 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1248, 1324 |  |
| 1248 | 1247 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1249 |  |
| 1249 | 1248 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1250 |  |
| 1250 | 1249 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1324 | 1247 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1325 |  |
| 1325 | 1324 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1326 |  |
| 1326 | 1325 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1327 |  |
| 1327 | 1326 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1328 |  |
| 1328 | 1327 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1225 | 1192 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1226 |  |
| 1226 | 1225 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1227 |  |
| 1227 | 1226 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1269 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1235 | 1191 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1236 |  |
| 1236 | 1235 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1237 |  |
| 1237 | 1236 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 | 1238 |  |
| 1238 | 1237 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1331 | 1190 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1332 |  |
| 1332 | 1331 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1359 |  |
| 1359 | 1332 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1277 | 1189 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1278 |  |
| 1278 | 1277 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1279 |  |
| 1279 | 1278 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 | 1357 |  |
| 1281 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1357 | 1279 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1384 | 1188 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1385 |  |
| 1385 | 1384 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 1362 | 1185 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1363 |  |
| 1363 | 1362 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1364 |  |
| 1364 | 1363 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1390 | 1184 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1391 |  |
| 1391 | 1390 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1392 |  |
| 1392 | 1391 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1394 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1288 | 1183 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1289 |  |
| 1289 | 1288 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1290 |  |
| 1290 | 1289 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1292 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1293 | 1182 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1294 |  |
| 1294 | 1293 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1295 |  |
| 1295 | 1294 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1297 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 1298 |  |
| 1298 | 1297 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1233 | 1181 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1234 |  |
| 1234 | 1233 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 |  |  |
| 1242 | 1180 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1243 |  |
| 1243 | 1242 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1244 |  |
| 1244 | 1243 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1311 | 1169 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1312, 1382 |  |
| 1312 | 1311 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1313 |  |
| 1313 | 1312 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1315 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1382 | 1311 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1383 |  |
| 1383 | 1382 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1302 | 1168 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1303 |  |
| 1303 | 1302 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1304 |  |
| 1304 | 1303 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1306 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1318 | 1147 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1371 |  |
| 1371 | 1318 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 1222 | 1146 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1223, 1287 |  |
| 1223 | 1222 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1224, 1284 |  |
| 1224 | 1223 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1284 | 1223 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1286 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1287 | 1222 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1175 | 1145 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1176 |  |
| 1176 | 1175 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1177, 1365 |  |
| 1177 | 1176 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1179 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1365 | 1176 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1333 | 1144 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1334 |  |
| 1334 | 1333 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1335 |  |
| 1335 | 1334 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1337 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1307 | 1143 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1308 |  |
| 1308 | 1307 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1309 |  |
| 1309 | 1308 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 | 1310 |  |
| 1310 | 1309 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1369 | 1142 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1379 |  |
| 1379 | 1369 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1380 |  |
| 1380 | 1379 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1272 | 1141 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1273 |  |
| 1273 | 1272 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1274 |  |
| 1274 | 1273 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1276 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1372 | 1140 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1373 |  |
| 1373 | 1372 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1374 |  |
| 1374 | 1373 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1376 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1347 | 1139 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1348 |  |
| 1348 | 1347 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1349 |  |
| 1349 | 1348 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1162 | 1138 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1163, 1370 |  |
| 1163 | 1162 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1164 |  |
| 1164 | 1163 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1166 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1167 |  |
| 1167 | 1166 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1370 | 1162 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 1239 | 1137 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1240, 1386 |  |
| 1240 | 1239 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1241 |  |
| 1241 | 1240 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1368 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1386 | 1239 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1322 | 1136 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1323, 1350 |  |
| 1323 | 1322 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 1350 | 1322 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1299 | 1135 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1300 |  |
| 1300 | 1299 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1301, 1345 |  |
| 1301 | 1300 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 1345 | 1300 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1245 | 1134 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1246 |  |
| 1246 | 1245 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1387 |  |
| 1387 | 1246 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1197 | 1133 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1201 |  |
| 1201 | 1197 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1202 |  |
| 1202 | 1201 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1210 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1351 | 1132 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1352 |  |
| 1352 | 1351 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 1157 | 1130 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1158 |  |
| 1158 | 1157 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1159 |  |
| 1159 | 1158 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1161 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1319 | 1129 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1320, 1338 |  |
| 1320 | 1319 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1338 | 1319 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1339 |  |
| 1339 | 1338 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1341 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1342 |  |
| 1342 | 1341 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1263 | 1128 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1264 |  |
| 1264 | 1263 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1265 |  |
| 1265 | 1264 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1267 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1206 | 1127 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1207, 1388 |  |
| 1207 | 1206 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1208 |  |
| 1208 | 1207 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1388 | 1206 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1389 |  |
| 1389 | 1388 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1316 | 1126 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1317 |  |
| 1317 | 1316 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 |  |  |
| 1251 | 1125 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1252, 1353 |  |
| 1252 | 1251 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1253 |  |
| 1253 | 1252 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1255 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1256 |  |
| 1256 | 1255 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1353 | 1251 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1216 | 1124 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1217 |  |
| 1217 | 1216 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1218 |  |
| 1218 | 1217 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1220 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1221 |  |
| 1221 | 1220 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1152 | 1123 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1153 |  |
| 1153 | 1152 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1154 |  |
| 1154 | 1153 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 1 |  |  |
| 1156 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 1321 |  |
| 1321 | 1156 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1211 | 1122 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1212 |  |
| 1212 | 1211 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1213 |  |
| 1213 | 1212 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1215 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1354 | 1121 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1355 |  |
| 1355 | 1354 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1356 |  |
| 1356 | 1355 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1257 | 1120 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1258 |  |
| 1258 | 1257 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1259 |  |
| 1259 | 1258 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1261 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 | 1378 |  |
| 1378 | 1261 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1282 | 1118 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 1283 |  |
| 1283 | 1282 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 | 1358 |  |
| 1330 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1358 | 1283 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1232 | 1117 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 1 |  |  |
| 1270 | 1117 | #commit | packages/svelte/src/internal/client/reactivity/batch.js | 629 | 10 | 0 | 1271 |  |
| 1271 | 1270 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 1 |  |  |
| 1204 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 1205 |  |
| 1205 | 1204 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 |  |  |
| 1343 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1344 |  |
| 1344 | 1343 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
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
| 516 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 517 |  |
| 517 | 516 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 518 |  |
| 518 | 517 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 519 |  |
| 519 | 518 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 522 |  | effect_root | packages/svelte/src/internal/client/reactivity/effects.js | 260 | 28 | 0 | 523 |  |
| 523 | 522 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 524 |  |
| 524 | 523 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 525 |  |
| 525 | 524 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 527 |  | render_effect | packages/svelte/src/internal/client/reactivity/effects.js | 375 | 30 | 0 | 528 |  |
| 528 | 527 | create_effect | packages/svelte/src/internal/client/reactivity/effects.js | 87 | 23 | 0 | 529 |  |
| 529 | 528 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 0 | 530 |  |
| 530 | 529 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 532 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 533 |  |
| 533 | 532 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 534 |  |
| 534 | 533 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 535 |  |
| 535 | 534 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 537 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 538 |  |
| 538 | 537 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 539 |  |
| 539 | 538 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 540 |  |
| 540 | 539 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 542 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 543 |  |
| 543 | 542 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 544 |  |
| 544 | 543 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 545 |  |
| 545 | 544 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 547 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 548 |  |
| 548 | 547 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 549 |  |
| 549 | 548 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 550 |  |
| 550 | 549 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 552 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 553 |  |
| 553 | 552 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 554 |  |
| 554 | 553 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 555 |  |
| 555 | 554 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 557 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 558 |  |
| 558 | 557 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 559 |  |
| 559 | 558 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 560 |  |
| 560 | 559 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 562 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 563 |  |
| 563 | 562 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 564 |  |
| 564 | 563 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 565 |  |
| 565 | 564 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 567 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 568 |  |
| 568 | 567 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 569 |  |
| 569 | 568 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 570 |  |
| 570 | 569 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 572 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 573 |  |
| 573 | 572 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 574 |  |
| 574 | 573 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 575 |  |
| 575 | 574 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 577 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 578 |  |
| 578 | 577 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 579 |  |
| 579 | 578 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 580 |  |
| 580 | 579 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 582 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 583 |  |
| 583 | 582 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 584 |  |
| 584 | 583 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 585 |  |
| 585 | 584 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 587 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 588 |  |
| 588 | 587 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 589 |  |
| 589 | 588 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 590 |  |
| 590 | 589 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 592 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 593 |  |
| 593 | 592 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 594 |  |
| 594 | 593 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 595 |  |
| 595 | 594 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 597 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 598 |  |
| 598 | 597 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 599 |  |
| 599 | 598 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 600 |  |
| 600 | 599 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 602 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 603 |  |
| 603 | 602 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 604 |  |
| 604 | 603 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 605 |  |
| 605 | 604 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 607 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 608 |  |
| 608 | 607 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 609 |  |
| 609 | 608 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 610 |  |
| 610 | 609 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 612 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 613 |  |
| 613 | 612 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 614 |  |
| 614 | 613 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 615 |  |
| 615 | 614 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 617 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 618 |  |
| 618 | 617 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 619 |  |
| 619 | 618 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 620 |  |
| 620 | 619 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 622 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 623 |  |
| 623 | 622 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 624 |  |
| 624 | 623 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 625 |  |
| 625 | 624 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 627 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 628 |  |
| 628 | 627 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 629 |  |
| 629 | 628 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 630 |  |
| 630 | 629 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 632 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 633 |  |
| 633 | 632 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 634 |  |
| 634 | 633 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 635 |  |
| 635 | 634 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 637 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 638 |  |
| 638 | 637 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 639 |  |
| 639 | 638 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 640 |  |
| 640 | 639 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 642 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 643 |  |
| 643 | 642 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 644 |  |
| 644 | 643 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 645 |  |
| 645 | 644 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 647 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 648 |  |
| 648 | 647 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 649 |  |
| 649 | 648 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 650 |  |
| 650 | 649 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 652 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 653 |  |
| 653 | 652 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 654 |  |
| 654 | 653 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 655 |  |
| 655 | 654 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 657 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 658 |  |
| 658 | 657 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 659 |  |
| 659 | 658 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 660 |  |
| 660 | 659 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 662 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 663 |  |
| 663 | 662 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 664 |  |
| 664 | 663 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 665 |  |
| 665 | 664 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 667 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 668 |  |
| 668 | 667 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 669 |  |
| 669 | 668 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 670 |  |
| 670 | 669 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 672 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 673 |  |
| 673 | 672 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 674 |  |
| 674 | 673 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 675 |  |
| 675 | 674 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 677 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 678 |  |
| 678 | 677 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 679 |  |
| 679 | 678 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 680 |  |
| 680 | 679 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 682 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 683 |  |
| 683 | 682 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 684 |  |
| 684 | 683 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 685 |  |
| 685 | 684 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 687 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 688 |  |
| 688 | 687 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 689 |  |
| 689 | 688 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 690 |  |
| 690 | 689 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 692 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 693 |  |
| 693 | 692 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 694 |  |
| 694 | 693 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 695 |  |
| 695 | 694 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 697 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 698 |  |
| 698 | 697 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 699 |  |
| 699 | 698 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 700 |  |
| 700 | 699 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 702 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 703 |  |
| 703 | 702 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 704 |  |
| 704 | 703 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 705 |  |
| 705 | 704 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 707 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 708 |  |
| 708 | 707 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 709 |  |
| 709 | 708 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 710 |  |
| 710 | 709 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 712 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 713 |  |
| 713 | 712 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 714 |  |
| 714 | 713 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 715 |  |
| 715 | 714 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 717 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 718 |  |
| 718 | 717 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 719 |  |
| 719 | 718 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 720 |  |
| 720 | 719 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 722 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 723 |  |
| 723 | 722 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 724 |  |
| 724 | 723 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 725 |  |
| 725 | 724 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 727 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 728 |  |
| 728 | 727 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 729 |  |
| 729 | 728 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 730 |  |
| 730 | 729 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 732 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 733 |  |
| 733 | 732 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 734 |  |
| 734 | 733 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 735 |  |
| 735 | 734 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 737 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 738 |  |
| 738 | 737 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 739 |  |
| 739 | 738 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 740 |  |
| 740 | 739 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 742 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 743 |  |
| 743 | 742 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 744 |  |
| 744 | 743 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 745 |  |
| 745 | 744 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 747 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 748 |  |
| 748 | 747 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 749 |  |
| 749 | 748 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 750 |  |
| 750 | 749 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 752 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 753 |  |
| 753 | 752 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 754 |  |
| 754 | 753 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 755 |  |
| 755 | 754 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 757 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 758 |  |
| 758 | 757 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 759 |  |
| 759 | 758 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 760 |  |
| 760 | 759 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 762 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 763 |  |
| 763 | 762 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 764 |  |
| 764 | 763 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 765 |  |
| 765 | 764 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 767 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 768 |  |
| 768 | 767 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 769 |  |
| 769 | 768 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 770 |  |
| 770 | 769 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 |  |  |
| 1058 |  | (garbage collector) |  | 0 | 0 | 55 |  |  |
| 1396 |  | (idle) |  | 0 | 0 | 98 |  |  |
| 1401 |  | flushSync | packages/svelte/src/internal/client/reactivity/batch.js | 984 | 26 | 6 | 1402 |  |
| 1402 | 1401 | flush | packages/svelte/src/internal/client/reactivity/batch.js | 584 | 8 | 26 | 1403 |  |
| 1403 | 1402 | #process | packages/svelte/src/internal/client/reactivity/batch.js | 268 | 11 | 43 | 1404, 1635, 1654, 1726, 1877 |  |
| 1404 | 1403 | flush_queued_effects | packages/svelte/src/internal/client/reactivity/batch.js | 1059 | 30 | 19 | 1405, 1753 |  |
| 1405 | 1404 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 1406, 1538 |  |
| 1406 | 1405 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1407, 1698 |  |
| 1407 | 1406 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1408, 1707 |  |
| 1408 | 1407 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1409, 1519 |  |
| 1409 | 1408 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1410, 1605 |  |
| 1410 | 1409 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 1411, 1597 |  |
| 1411 | 1410 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1412, 1558 |  |
| 1412 | 1411 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1413, 1618 |  |
| 1413 | 1412 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1414, 1686 |  |
| 1414 | 1413 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 1415, 1580 |  |
| 1415 | 1414 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 1416, 1759 |  |
| 1416 | 1415 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1417, 1637 |  |
| 1417 | 1416 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1418, 1692 |  |
| 1418 | 1417 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1419, 1570 |  |
| 1419 | 1418 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1420, 1608 |  |
| 1420 | 1419 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 1421, 1644 |  |
| 1421 | 1420 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1422, 1613 |  |
| 1422 | 1421 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1423, 1762 |  |
| 1423 | 1422 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1424, 1768 |  |
| 1424 | 1423 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 0 | 1425, 1737 |  |
| 1425 | 1424 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1426, 1673 |  |
| 1426 | 1425 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 1427, 1543 |  |
| 1427 | 1426 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1428, 1563 |  |
| 1428 | 1427 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1429, 1678 |  |
| 1429 | 1428 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1430, 1601 |  |
| 1430 | 1429 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1431, 1547 |  |
| 1431 | 1430 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1432, 1696 |  |
| 1432 | 1431 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1433, 1528 |  |
| 1433 | 1432 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 7 | 1491, 1555 |  |
| 1491 | 1433 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1492, 1720 |  |
| 1492 | 1491 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1493, 1560 |  |
| 1493 | 1492 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1494, 1568 |  |
| 1494 | 1493 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1495, 1586 |  |
| 1495 | 1494 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1496, 1573 |  |
| 1496 | 1495 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1497, 1516 |  |
| 1497 | 1496 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 1498, 1536 |  |
| 1498 | 1497 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1499, 1615 |  |
| 1499 | 1498 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1500, 1655 |  |
| 1500 | 1499 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1501, 1514 |  |
| 1501 | 1500 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 6 | 1502, 1689 |  |
| 1502 | 1501 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1503, 1694 |  |
| 1503 | 1502 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1504, 1592 |  |
| 1504 | 1503 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1505, 1533 |  |
| 1505 | 1504 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1506, 1627 |  |
| 1506 | 1505 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1507, 1590 |  |
| 1507 | 1506 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 | 1508, 1575 |  |
| 1508 | 1507 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 | 1509, 1622 |  |
| 1509 | 1508 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 | 1510, 1549 |  |
| 1510 | 1509 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1511, 1853 |  |
| 1511 | 1510 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1512 |  |
| 1512 | 1511 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 1712 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 8 | 1950 |  |
| 1950 | 1712 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1853 | 1510 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1549 | 1509 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 4 | 1550, 1602 |  |
| 1550 | 1549 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 5 | 1551, 1854 |  |
| 1551 | 1550 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1552 |  |
| 1552 | 1551 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 1553 |  |
| 1553 | 1552 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 15 |  |  |
| 1683 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1854 | 1550 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1602 | 1549 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1603, 1825, 1945 |  |
| 1603 | 1602 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1604, 1961 |  |
| 1604 | 1603 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1961 | 1603 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1825 | 1602 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1945 | 1602 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1946 |  |
| 1946 | 1945 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1622 | 1508 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1623, 1750 |  |
| 1623 | 1622 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1624 |  |
| 1624 | 1623 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1626 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1750 | 1622 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1575 | 1507 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1576, 1792, 1846 |  |
| 1576 | 1575 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1577, 1952 |  |
| 1577 | 1576 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1579 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1952 | 1576 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1792 | 1575 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 | 1829 |  |
| 1829 | 1792 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1846 | 1575 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1590 | 1506 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1591, 1942 |  |
| 1591 | 1590 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 1650 |  |
| 1650 | 1591 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 11 |  |  |
| 1652 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 | 1653 |  |
| 1653 | 1652 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1788 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1942 | 1590 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1943 |  |
| 1943 | 1942 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1627 | 1505 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1628, 1713 |  |
| 1628 | 1627 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1629, 1880 |  |
| 1629 | 1628 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 8 |  |  |
| 1631 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1632 |  |
| 1632 | 1631 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1880 | 1628 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1713 | 1627 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1533 | 1504 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1534, 1970 |  |
| 1534 | 1533 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1535 |  |
| 1535 | 1534 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 8 | 1780 |  |
| 1780 | 1535 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1819 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1852 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1970 | 1533 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1592 | 1503 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1593 |  |
| 1593 | 1592 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 0 | 1594, 1867 |  |
| 1594 | 1593 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 1596 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1894 |  |
| 1894 | 1596 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1867 | 1593 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1694 | 1502 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1695, 1745 |  |
| 1695 | 1694 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1745 | 1694 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1746 |  |
| 1746 | 1745 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 | 1904 |  |
| 1748 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1749 |  |
| 1749 | 1748 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1904 | 1746 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1689 | 1501 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1690, 1900 |  |
| 1690 | 1689 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1691, 1728 |  |
| 1691 | 1690 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1728 | 1690 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1730 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 6 |  |  |
| 1900 | 1689 | mirror_to_para | packages/svelte/src/internal/client/reactivity/sources.js | 131 | 31 | 1 |  |  |
| 1514 | 1500 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1515, 1844 |  |
| 1515 | 1514 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1693, 1953 |  |
| 1693 | 1515 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1859 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1864 |  |
| 1864 | 1859 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1953 | 1515 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1844 | 1514 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1655 | 1499 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1656 |  |
| 1656 | 1655 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1657, 1955 |  |
| 1657 | 1656 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1822 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 |  |  |
| 1955 | 1656 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1615 | 1498 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1616, 1901 |  |
| 1616 | 1615 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1617 |  |
| 1617 | 1616 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 8 |  |  |
| 1807 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1835 |  |
| 1835 | 1807 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1901 | 1615 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 | 1903 |  |
| 1903 | 1901 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1536 | 1497 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1537, 1848 |  |
| 1537 | 1536 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1812 |  |
| 1812 | 1537 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 10 |  |  |
| 1814 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 9 |  |  |
| 1848 | 1536 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1516 | 1496 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1517, 1636, 1781 |  |
| 1517 | 1516 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1518 |  |
| 1518 | 1517 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1816 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 | 1856 |  |
| 1856 | 1816 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1636 | 1516 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 3 |  |  |
| 1781 | 1516 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1573 | 1495 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 1574, 1884 |  |
| 1574 | 1573 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1775 |  |
| 1775 | 1574 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1777 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1884 | 1573 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1586 | 1494 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 1587 |  |
| 1587 | 1586 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1588 |  |
| 1588 | 1587 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 1756 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1940 |  |
| 1940 | 1756 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1568 | 1493 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1569 |  |
| 1569 | 1568 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 5 | 1725 |  |
| 1725 | 1569 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 |  |  |
| 1893 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1962 |  |
| 1962 | 1893 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1560 | 1492 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1561, 1906 |  |
| 1561 | 1560 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1562, 1948 |  |
| 1562 | 1561 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 1831 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1951 |  |
| 1951 | 1831 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1948 | 1561 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1906 | 1560 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 2 |  |  |
| 1720 | 1491 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1721, 1809 |  |
| 1721 | 1720 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1722 |  |
| 1722 | 1721 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1885 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1809 | 1720 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 3 |  |  |
| 1555 | 1433 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 1556, 1757 |  |
| 1556 | 1555 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1557, 1779 |  |
| 1557 | 1556 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 | 1811 |  |
| 1845 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1811 | 1557 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1779 | 1556 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1757 | 1555 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 |  |  |
| 1528 | 1432 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1529, 1828 |  |
| 1529 | 1528 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 7 | 1530 |  |
| 1530 | 1529 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 1532 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 | 1941 |  |
| 1941 | 1532 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1828 | 1528 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1696 | 1431 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 1697 |  |
| 1697 | 1696 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1734, 1855 |  |
| 1734 | 1697 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1767 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 | 1899 |  |
| 1899 | 1767 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1855 | 1697 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1547 | 1430 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1548, 1833 |  |
| 1548 | 1547 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1703 |  |
| 1703 | 1548 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1705 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1827 |  |
| 1827 | 1705 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1833 | 1547 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1601 | 1429 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1640 |  |
| 1640 | 1601 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1724, 1902 |  |
| 1724 | 1640 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1784 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 |  |  |
| 1902 | 1640 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 2 |  |  |
| 1678 | 1428 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1679 |  |
| 1679 | 1678 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1680, 1944 |  |
| 1680 | 1679 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 | 1681 |  |
| 1681 | 1680 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1841 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1842 |  |
| 1842 | 1841 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1944 | 1679 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1563 | 1427 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1564 |  |
| 1564 | 1563 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1565 |  |
| 1565 | 1564 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 2 | 1964 |  |
| 1567 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1890 |  | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1964 | 1565 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1543 | 1426 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1544, 1826, 1910 |  |
| 1544 | 1543 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1545, 1785 |  |
| 1545 | 1544 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 |  |  |
| 1832 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1785 | 1544 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1826 | 1543 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1910 | 1543 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1911 |  |
| 1911 | 1910 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1673 | 1425 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1674, 1909 |  |
| 1674 | 1673 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1675 |  |
| 1675 | 1674 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1677 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1909 | 1673 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1737 | 1424 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1738, 1820 |  |
| 1738 | 1737 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1739 |  |
| 1739 | 1738 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 | 1740 |  |
| 1740 | 1739 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1752 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1820 | 1737 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1821 |  |
| 1821 | 1820 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1768 | 1423 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1769 |  |
| 1769 | 1768 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1770 |  |
| 1770 | 1769 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 | 1790 |  |
| 1772 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 |  |  |
| 1790 | 1770 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1762 | 1422 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1763, 1863, 1871 |  |
| 1763 | 1762 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1764, 1824 |  |
| 1764 | 1763 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 1824 | 1763 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1838 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 6 |  |  |
| 1863 | 1762 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 2 |  |  |
| 1871 | 1762 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1613 | 1421 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1614, 1886 |  |
| 1614 | 1613 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1684 |  |
| 1684 | 1614 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 9 |  |  |
| 1773 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 9 | 1793 |  |
| 1793 | 1773 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1886 | 1613 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1887 |  |
| 1887 | 1886 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1644 | 1420 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1645, 1965 |  |
| 1645 | 1644 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1646 |  |
| 1646 | 1645 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1648 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 0 | 1649 |  |
| 1649 | 1648 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1965 | 1644 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1966 |  |
| 1966 | 1965 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1608 | 1419 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1609, 1860 |  |
| 1609 | 1608 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1610, 1840 |  |
| 1610 | 1609 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 3 | 1836 |  |
| 1612 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 | 1865 |  |
| 1865 | 1612 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1836 | 1610 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1840 | 1609 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1860 | 1608 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1570 | 1418 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1571, 1843, 1971 |  |
| 1571 | 1570 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1572, 1956 |  |
| 1572 | 1571 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1870 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 | 1873 |  |
| 1873 | 1870 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1956 | 1571 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1843 | 1570 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1971 | 1570 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1692 | 1417 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1714 |  |
| 1714 | 1692 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 4 | 1715 |  |
| 1715 | 1714 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 | 1774 |  |
| 1717 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 |  |  |
| 1774 | 1715 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1637 | 1416 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1638, 1969 |  |
| 1638 | 1637 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1639 |  |
| 1639 | 1638 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 1805 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1908 |  |
| 1908 | 1805 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1969 | 1637 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1759 | 1415 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1760, 1851 |  |
| 1760 | 1759 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 6 | 1761 |  |
| 1761 | 1760 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 1801 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 7 |  |  |
| 1851 | 1759 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1580 | 1414 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1581 |  |
| 1581 | 1580 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1582 |  |
| 1582 | 1581 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 | 1727 |  |
| 1584 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1585 |  |
| 1585 | 1584 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1727 | 1582 | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 1 |  |  |
| 1686 | 1413 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1687, 1968 |  |
| 1687 | 1686 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1723 |  |
| 1723 | 1687 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 7 |  |  |
| 1797 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 | 1888 |  |
| 1888 | 1797 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1968 | 1686 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1618 | 1412 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1619, 1876 |  |
| 1619 | 1618 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1620 |  |
| 1620 | 1619 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 | 1881 |  |
| 1742 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1743 |  |
| 1743 | 1742 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1881 | 1620 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 2 |  |  |
| 1876 | 1618 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1558 | 1411 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1559, 1641, 1872 |  |
| 1559 | 1558 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1641 | 1558 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1642 |  |
| 1642 | 1641 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1849 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1850 |  |
| 1850 | 1849 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 1872 | 1558 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1597 | 1410 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1598, 1633 |  |
| 1598 | 1597 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1599 |  |
| 1599 | 1598 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 1633 | 1597 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1634 |  |
| 1634 | 1633 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 4 |  |  |
| 1795 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 | 1823 |  |
| 1823 | 1795 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1605 | 1409 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 2 | 1606, 1875, 1891 |  |
| 1606 | 1605 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1607, 1947 |  |
| 1607 | 1606 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 12 |  |  |
| 1719 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 5 |  |  |
| 1947 | 1606 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 1 |  |  |
| 1875 | 1605 | increment_write_version | packages/svelte/src/internal/client/runtime.js | 146 | 40 | 1 |  |  |
| 1891 | 1605 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1892 |  |
| 1892 | 1891 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1519 | 1408 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 3 | 1520, 1839 |  |
| 1520 | 1519 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 9 | 1521 |  |
| 1521 | 1520 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 0 | 1522 |  |
| 1522 | 1521 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1732 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1733 |  |
| 1733 | 1732 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 3 |  |  |
| 1839 | 1519 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 1 |  |  |
| 1707 | 1407 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1708 |  |
| 1708 | 1707 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 2 | 1709 |  |
| 1709 | 1708 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1711 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1698 | 1406 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 0 | 1699, 1882 |  |
| 1699 | 1698 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 1 | 1700, 1786 |  |
| 1700 | 1699 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 | 1765 |  |
| 1702 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 |  |  |
| 1765 | 1700 | set_component_context | packages/svelte/src/internal/client/context.js | 14 | 38 | 1 |  |  |
| 1786 | 1699 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1882 | 1698 | update_derived_status | packages/svelte/src/internal/client/reactivity/status.js | 18 | 38 | 0 | 1883 |  |
| 1883 | 1882 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 1538 | 1405 | update_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 381 | 31 | 1 | 1539 |  |
| 1539 | 1538 | execute_derived | packages/svelte/src/internal/client/reactivity/deriveds.js | 333 | 32 | 3 | 1540, 1554, 1857 |  |
| 1540 | 1539 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 6 |  |  |
| 1542 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 4 | 1847 |  |
| 1847 | 1542 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
| 1554 | 1539 | destroy_derived_effects | packages/svelte/src/internal/client/reactivity/deriveds.js | 309 | 40 | 1 |  |  |
| 1857 | 1539 | set_active_effect | packages/svelte/src/internal/client/runtime.js | 86 | 34 | 2 |  |  |
| 1753 | 1404 | update_effect | packages/svelte/src/internal/client/runtime.js | 437 | 30 | 7 | 1754 |  |
| 1754 | 1753 | update_reaction | packages/svelte/src/internal/client/runtime.js | 226 | 32 | 5 |  |  |
| 1798 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 2 | 1898 |  |
| 1898 | 1798 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 2 |  |  |
| 1635 | 1403 | #unlink | packages/svelte/src/internal/client/reactivity/batch.js | 956 | 10 | 2 |  |  |
| 1654 | 1403 | #traverse | packages/svelte/src/internal/client/reactivity/batch.js | 417 | 12 | 9 |  |  |
| 1726 | 1403 | #is_deferred | packages/svelte/src/internal/client/reactivity/batch.js | 209 | 15 | 1 |  |  |
| 1877 | 1403 | #find_earlier_batch | packages/svelte/src/internal/client/reactivity/batch.js | 462 | 22 | 1 |  |  |
| 1435 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 0 | 1436 |  |
| 1436 | 1435 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 1 | 1437, 1957 |  |
| 1437 | 1436 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1438 |  |
| 1438 | 1437 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1439 |  |
| 1439 | 1438 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1440 |  |
| 1440 | 1439 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1441 |  |
| 1441 | 1440 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1442 |  |
| 1442 | 1441 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1443 |  |
| 1443 | 1442 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1444 |  |
| 1444 | 1443 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1445 |  |
| 1445 | 1444 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1446 |  |
| 1446 | 1445 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1447 |  |
| 1447 | 1446 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1448 |  |
| 1448 | 1447 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1449 |  |
| 1449 | 1448 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1450 |  |
| 1450 | 1449 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1451, 1912 |  |
| 1451 | 1450 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1912 | 1450 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1913 |  |
| 1913 | 1912 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1914 |  |
| 1914 | 1913 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1915 |  |
| 1915 | 1914 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1916 |  |
| 1916 | 1915 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1917 |  |
| 1917 | 1916 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1918 |  |
| 1918 | 1917 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1919 |  |
| 1919 | 1918 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1920 |  |
| 1920 | 1919 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1921 |  |
| 1921 | 1920 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1922 |  |
| 1922 | 1921 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1923 |  |
| 1923 | 1922 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1924 |  |
| 1924 | 1923 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1925 |  |
| 1925 | 1924 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1926 |  |
| 1926 | 1925 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1927 |  |
| 1927 | 1926 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1928 |  |
| 1928 | 1927 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1929 |  |
| 1929 | 1928 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1930 |  |
| 1930 | 1929 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1931 |  |
| 1931 | 1930 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1932 |  |
| 1932 | 1931 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1933 |  |
| 1933 | 1932 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1934 |  |
| 1934 | 1933 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1935 |  |
| 1935 | 1934 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1936 |  |
| 1936 | 1935 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1937 |  |
| 1937 | 1936 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 0 | 1938 |  |
| 1938 | 1937 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 |  |  |
| 1957 | 1436 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 0 | 1958 |  |
| 1958 | 1957 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 1959 |  |
| 1959 | 1958 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 1 |  |  |
| 1453 |  | set | packages/svelte/src/internal/client/reactivity/sources.js | 196 | 20 | 15 | 1454 |  |
| 1454 | 1453 | internal_set | packages/svelte/src/internal/client/reactivity/sources.js | 225 | 29 | 21 | 1455, 1523, 1621, 1861 |  |
| 1455 | 1454 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1456 |  |
| 1456 | 1455 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1457 |  |
| 1457 | 1456 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1458 |  |
| 1458 | 1457 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1459 |  |
| 1459 | 1458 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1460 |  |
| 1460 | 1459 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 8 | 1461 |  |
| 1461 | 1460 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1462 |  |
| 1462 | 1461 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1463, 1688, 1789 |  |
| 1463 | 1462 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1464, 1866 |  |
| 1464 | 1463 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1465, 1874 |  |
| 1465 | 1464 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1466, 1895 |  |
| 1466 | 1465 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1467, 1954 |  |
| 1467 | 1466 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1468, 1939 |  |
| 1468 | 1467 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1469 |  |
| 1469 | 1468 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1470, 1672 |  |
| 1470 | 1469 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 6 | 1471 |  |
| 1471 | 1470 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1472 |  |
| 1472 | 1471 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1473 |  |
| 1473 | 1472 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1474 |  |
| 1474 | 1473 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1475 |  |
| 1475 | 1474 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1476 |  |
| 1476 | 1475 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1477 |  |
| 1477 | 1476 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1478, 1967 |  |
| 1478 | 1477 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1479 |  |
| 1479 | 1478 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1480, 1963 |  |
| 1480 | 1479 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1481 |  |
| 1481 | 1480 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1482, 1879 |  |
| 1482 | 1481 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1483, 1949 |  |
| 1483 | 1482 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1484, 1817 |  |
| 1484 | 1483 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1485 |  |
| 1485 | 1484 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1486 |  |
| 1486 | 1485 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1487 |  |
| 1487 | 1486 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1488, 1600 |  |
| 1488 | 1487 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1489 |  |
| 1489 | 1488 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1490, 1960 |  |
| 1490 | 1489 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1526 |  |
| 1526 | 1490 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 1 | 1527, 1658 |  |
| 1527 | 1526 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1658 | 1526 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 4 | 1659, 1905 |  |
| 1659 | 1658 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1660, 1868 |  |
| 1660 | 1659 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 9 | 1661 |  |
| 1661 | 1660 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 5 | 1662, 1834 |  |
| 1662 | 1661 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1663, 1787, 1862 |  |
| 1663 | 1662 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1664, 1778 |  |
| 1664 | 1663 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1665 |  |
| 1665 | 1664 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1666, 1791 |  |
| 1666 | 1665 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1667 |  |
| 1667 | 1666 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1668 |  |
| 1668 | 1667 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1669, 1799 |  |
| 1669 | 1668 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 2 | 1670 |  |
| 1670 | 1669 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 3 | 1671 |  |
| 1671 | 1670 | mark_reactions | packages/svelte/src/internal/client/reactivity/sources.js | 385 | 24 | 10 | 1735 |  |
| 1735 | 1671 | schedule_effect | packages/svelte/src/internal/client/reactivity/batch.js | 1210 | 32 | 0 | 1736 |  |
| 1736 | 1735 | schedule | packages/svelte/src/internal/client/reactivity/batch.js | 895 | 11 | 4 |  |  |
| 1799 | 1668 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1791 | 1665 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1778 | 1663 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1787 | 1662 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 1862 | 1662 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1834 | 1661 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1868 | 1659 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 1905 | 1658 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1960 | 1489 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1600 | 1487 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1817 | 1483 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1949 | 1482 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1879 | 1481 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1963 | 1479 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1967 | 1477 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1672 | 1469 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1939 | 1467 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1954 | 1466 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1895 | 1465 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1874 | 1464 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1866 | 1463 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 1 |  |  |
| 1688 | 1462 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 1 |  |  |
| 1789 | 1462 | set_signal_status | packages/svelte/src/internal/client/reactivity/status.js | 10 | 34 | 2 |  |  |
| 1523 | 1454 | ensure | packages/svelte/src/internal/client/reactivity/batch.js | 825 | 16 | 4 | 1524, 1782 |  |
| 1524 | 1523 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 90 | 8 | 0 | 1525 |  |
| 1525 | 1524 | Batch | packages/svelte/src/internal/client/reactivity/batch.js | 91 | 3 | 53 |  |  |
| 1782 | 1523 | #link | packages/svelte/src/internal/client/reactivity/batch.js | 945 | 8 | 5 |  |  |
| 1621 | 1454 | capture | packages/svelte/src/internal/client/reactivity/batch.js | 554 | 10 | 13 |  |  |
| 1861 | 1454 | is_runes | packages/svelte/src/internal/client/context.js | 229 | 25 | 2 |  |  |
| 1744 |  | get | packages/svelte/src/internal/client/runtime.js | 530 | 20 | 3 | 1878 |  |
| 1878 | 1744 | is_dirty | packages/svelte/src/internal/client/runtime.js | 156 | 25 | 1 |  |  |
