import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_2 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		$$slots: {
			main: ($$anchor, $$slotProps) => {
				const bar = $.derived_safe_equal(() => $$slotProps.foo);
				var p = root_2();
				var text = $.child(p, true);

				$.reset(p);
				$.template_effect(() => $.set_text(text, $.get(bar)));
				$.append($$anchor, p);
			}
		}
	});
}