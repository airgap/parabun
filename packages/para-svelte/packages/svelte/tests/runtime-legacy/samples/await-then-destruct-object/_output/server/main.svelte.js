import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`loading...`);
		},
		({ result, error }) => {
			$$renderer.push(`<p>error: ${$.escape(error)}</p> <p>result: ${$.escape(result)}</p>`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}