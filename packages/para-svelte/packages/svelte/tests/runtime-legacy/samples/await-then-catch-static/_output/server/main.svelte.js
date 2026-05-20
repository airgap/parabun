import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let promise = $$props['promise'];

	$.await(
		$$renderer,
		promise,
		() => {
			$$renderer.push(`<p>loading...</p>`);
		},
		(value) => {
			$$renderer.push(`<p>loaded</p>`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise });
}