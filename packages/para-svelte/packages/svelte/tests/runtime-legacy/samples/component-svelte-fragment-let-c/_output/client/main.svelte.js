import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_2 = $.from_html(`<span> </span>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		$$slots: {
			main: ($$anchor, $$slotProps) => {
				const c = $.derived_safe_equal(() => $$slotProps.c);
				const count = $.derived_safe_equal(() => $$slotProps.count);
				var span = root_2();
				var text = $.child(span);

				$.reset(span);
				$.template_effect(() => $.set_text(text, `${$.get(c) ?? ''} (${$.get(count) ?? ''})`));
				$.append($$anchor, span);
			}
		}
	});
}