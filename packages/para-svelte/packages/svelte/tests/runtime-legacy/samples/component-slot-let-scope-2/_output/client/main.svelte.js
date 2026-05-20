import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<span> </span>`);
var root_3 = $.from_html(`<span> </span>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const thing = $.derived_safe_equal(() => $$slotProps.thing);
				var span = root_1();
				var text = $.child(span, true);

				$.reset(span);
				$.template_effect(() => $.set_text(text, $.get(thing)));
				$.append($$anchor, span);
			},

			thing: ($$anchor, $$slotProps) => {
				const thing = $.derived_safe_equal(() => $$slotProps.thing);
				var span_1 = root_3();
				var text_1 = $.child(span_1, true);

				$.reset(span_1);
				$.template_effect(() => $.set_text(text_1, $.get(thing)));
				$.append($$anchor, span_1);
			}
		}
	});
}