import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p slot="foo"> </p>`);
var root_3 = $.from_html(`<p slot="bar"></p>`);

export default function Main($$anchor) {
	let count = 42;

	Nested($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const count = $.derived_safe_equal(() => $$slotProps.count);
				var p = root_1();
				var text = $.child(p);

				$.reset(p);
				$.template_effect(() => $.set_text(text, `count in default slot: ${$.get(count) ?? ''}`));
				$.append($$anchor, p);
			},

			foo: ($$anchor, $$slotProps) => {
				var p_1 = root_2();
				const count = $.derived_safe_equal(() => $$slotProps.count);
				var text_1 = $.child(p_1);

				$.reset(p_1);
				$.template_effect(() => $.set_text(text_1, `count in foo slot: ${$.get(count) ?? ''}`));
				$.append($$anchor, p_1);
			},

			bar: ($$anchor, $$slotProps) => {
				var p_2 = root_3();

				p_2.textContent = 'count in bar slot: 42';
				$.append($$anchor, p_2);
			}
		}
	});
}