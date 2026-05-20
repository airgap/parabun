import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];
	let show = $$props['show'];

	$$renderer.push(`<div>`);

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`<p>loading...</p>`);
		},
		(theValue) => {
			if (show) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<p>the value is ${$.escape(theValue)}</p>`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]-->`);
		}
	);

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { thePromise, show });
}