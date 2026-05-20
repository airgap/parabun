import * as $ from 'svelte/internal/server';
import One from './One.svelte';

export default function Main($$renderer, $$props) {
	let a = $.fallback($$props['a'], 1);
	let b = $.fallback($$props['b'], 2);

	One($$renderer, {
		a,
		b,
		$$slots: {
			one: ($$renderer, { one, two }) => {
				$$renderer.push(`<p slot="one">one: ${$.escape(one)} two: ${$.escape(two)}</p>`);
			}
		}
	});

	$.bind_props($$props, { a, b });
}