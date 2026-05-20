import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`loading...`);
		},
		({ 1: a, 3: b, 4: c }) => {
			$$renderer.push(`<p>[1] ${$.escape(a)}</p> <p>[3] ${$.escape(b)}</p> <p>[4] ${$.escape(c)}</p>`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}