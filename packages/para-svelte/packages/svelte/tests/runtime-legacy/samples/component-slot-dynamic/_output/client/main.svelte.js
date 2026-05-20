import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<p>override default slot</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let nested = $.prop($$props, 'nested', 12);

	var $$exports = {
		get nested() {
			return nested();
		},

		set nested($$value) {
			nested($$value);
			$.flush();
		}
	};

	$.bind_this(
		Nested($$anchor, {
			children: ($$anchor, $$slotProps) => {
				var p = root_1();

				$.append($$anchor, p);
			},
			$$slots: { default: true },
			$$legacy: true
		}),
		($$value) => nested($$value),
		() => nested()
	);

	return $.pop($$exports);
}