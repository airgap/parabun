import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let button = $$props['button'];
	let thePromise = $$props['thePromise'];
	let clicked = $$props['clicked'];

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`<p>loading...</p>`);
		},
		(theValue) => {
			$$renderer.push(`<button>click me</button>`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { button, thePromise, clicked });
}