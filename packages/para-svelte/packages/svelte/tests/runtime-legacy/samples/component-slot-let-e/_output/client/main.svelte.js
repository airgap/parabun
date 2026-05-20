import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const someText = $.derived_safe_equal(() => $$slotProps.someText);
				var p = root_1();
				var text = $.child(p, true);

				$.reset(p);
				$.template_effect(() => $.set_text(text, $.get(someText)));
				$.append($$anchor, p);
			}
		}
	});
}