import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';

export default function Main($$anchor) {
	const things = { '1': 'one' };

	Foo($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const id = $.derived_safe_equal(() => $$slotProps.id);

				Bar($$anchor, {
					get thing() {
						return (
							$.deep_read_state($.get(id)),
							$.untrack(() => things[$.get(id)])
						);
					}
				});
			}
		}
	});
}