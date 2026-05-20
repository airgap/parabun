import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	$.await($$renderer, thePromise, () => {}, () => {});
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}