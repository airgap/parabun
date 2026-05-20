import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let obj = $.fallback($$props['obj'], () => ({ a: 1, b: 42 }), true);
	let c = $.fallback($$props['c'], 5);
	let d = $.fallback($$props['d'], 10);

	Nested($$renderer, {
		obj,
		c,
		d,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { a, b, c, d }) => {
				$$renderer.push(`<p>${$.escape(a)}</p> <p>${$.escape(b)}</p> <p>${$.escape(c)}</p> <p>${$.escape(d)}</p>`);
			}
		}
	});

	$.bind_props($$props, { obj, c, d });
}