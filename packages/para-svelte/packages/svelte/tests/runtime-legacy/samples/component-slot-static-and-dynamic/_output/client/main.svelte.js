import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from "./Nested.svelte";

var root_1 = $.from_html(`<span slot="a">static</span>`);
var root_2 = $.from_html(`<span slot="b"> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let dynamic = $.prop($$props, 'dynamic', 12, 0);

	var $$exports = {
		get dynamic() {
			return dynamic();
		},

		set dynamic($$value) {
			dynamic($$value);
			$.flush();
		}
	};

	Nested($$anchor, {
		$$slots: {
			a: ($$anchor, $$slotProps) => {
				var span = root_1();

				$.append($$anchor, span);
			},

			b: ($$anchor, $$slotProps) => {
				var span_1 = root_2();
				var text = $.child(span_1, true);

				$.reset(span_1);
				$.template_effect(() => $.set_text(text, dynamic()));
				$.append($$anchor, span_1);
			}
		}
	});

	return $.pop($$exports);
}