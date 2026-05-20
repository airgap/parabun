import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`waiting`);
		},
		() => {
			$$renderer.push(`resolved`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}