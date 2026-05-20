import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Inner from './inner.svelte';

export default function Outer($$anchor, $$props) {
	Inner($$anchor, {
		$$slots: {
			x: ($$anchor, $$slotProps) => {
				var fragment_1 = $.comment();
				var node = $.first_child(fragment_1);
				const foo = $.derived_safe_equal(() => $$slotProps.foo);

				$.slot(
					node,
					$$props,
					'x',
					{
						get foo() {
							return $.get(foo);
						}
					},
					($$anchor) => {
						var text = $.text();

						$.template_effect(() => $.set_text(text, $.get(foo)));
						$.append($$anchor, text);
					}
				);

				$.append($$anchor, fragment_1);
			}
		}
	});
}