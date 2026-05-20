import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_2 = $.from_html(`<span> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);

	var $$exports = {
		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		}
	};

	Nested($$anchor, {
		get things() {
			return things();
		},

		$$slots: {
			main: ($$anchor, $$slotProps) => {
				const x = $.derived_safe_equal(() => $$slotProps.thing);
				var span = root_2();
				var text = $.child(span, true);

				$.reset(span);
				$.template_effect(() => $.set_text(text, $.get(x)));
				$.append($$anchor, span);
			}
		}
	});

	return $.pop($$exports);
}