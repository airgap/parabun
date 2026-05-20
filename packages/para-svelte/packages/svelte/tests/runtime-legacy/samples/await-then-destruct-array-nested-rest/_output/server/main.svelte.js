import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`loading...`);
		},
		([a, b, ...[,, c, ...{ length }]]) => {
			$$renderer.push(`<p>a: ${$.escape(a)}</p> <p>b: ${$.escape(b)}</p> <p>c: ${$.escape(c)}</p> <p>remaining length: ${$.escape(length)}</p>`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}