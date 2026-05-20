import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let show = $$props['show'];
	let thePromise = $$props['thePromise'];

	if (show) {
		$$renderer.push('<!--[0-->');

		$.await(
			$$renderer,
			thePromise,
			() => {
				$$renderer.push(`<p>loading...</p>`);
			},
			(theValue) => {
				$$renderer.push(`<p>the value is ${$.escape(theValue)}</p>`);
			}
		);

		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<p>Else</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { show, thePromise });
}