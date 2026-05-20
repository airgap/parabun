import * as $ from 'svelte/internal/server';
import Nested from "./Nested.svelte";

export default function Main($$renderer, $$props) {
	let dynamic = $.fallback($$props['dynamic'], 0);

	Nested($$renderer, {
		$$slots: {
			a: ($$renderer) => {
				$$renderer.push(`<span slot="a">static</span>`);
			},

			b: ($$renderer) => {
				$$renderer.push(`<span slot="b">${$.escape(dynamic)}</span>`);
			}
		}
	});

	$.bind_props($$props, { dynamic });
}