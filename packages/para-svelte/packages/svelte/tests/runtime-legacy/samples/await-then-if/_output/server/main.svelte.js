import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`loading...`);
		},
		(r) => {
			if (r.length < 1) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<p>promise array is empty</p>`);
			} else {
				$$renderer.push('<!--[-1-->');
				$$renderer.push(`<p>promise array is not empty</p>`);
			}

			$$renderer.push(`<!--]-->`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}