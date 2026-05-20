import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`loading...`);
		},
		([a, b]) => {
			$$renderer.push(`<p>a: ${$.escape(a)}</p> <p>b: ${$.escape(b)}</p>`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}