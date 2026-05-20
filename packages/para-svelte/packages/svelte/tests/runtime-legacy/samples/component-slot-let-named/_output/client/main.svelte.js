import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<div slot="foo"><span> </span></div>`);

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
			foo: ($$anchor, $$slotProps) => {
				var div = root_1();
				const thing = $.derived_safe_equal(() => $$slotProps.thing);
				var span = $.child(div);
				var text = $.child(span, true);

				$.reset(span);
				$.reset(div);
				$.template_effect(() => $.set_text(text, $.get(thing)));
				$.append($$anchor, div);
			}
		}
	});

	return $.pop($$exports);
}