import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Outer from './outer.svelte';

var root_1 = $.from_html(`<div slot="x"> </div>`);

export default function Main($$anchor) {
	Outer($$anchor, {
		$$slots: {
			x: ($$anchor, $$slotProps) => {
				var div = root_1();
				const foo = $.derived_safe_equal(() => $$slotProps.foo);
				var text = $.child(div, true);

				$.reset(div);
				$.template_effect(() => $.set_text(text, $.get(foo)));
				$.append($$anchor, div);
			}
		}
	});
}