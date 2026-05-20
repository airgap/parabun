import * as $ from 'svelte/internal/server';
import Outer from "./Outer.svelte";

export default function Main($$renderer, $$props) {
	let log = $.fallback($$props['log'], () => [], true);
	let a = $$props['a'];
	let b = $$props['b'];

	Outer($$renderer, {
		log,
		a,
		b,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { outerCall }) => {
				$$renderer.push(`<button>click me</button>`);
			}
		}
	});

	$.bind_props($$props, { log, a, b });
}