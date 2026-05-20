import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];
	let count = $$props['count'];

	$$renderer.push(`<div>`);

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`<p>loading...</p>`);
		},
		(theValue) => {
			$$renderer.push(`Resolved: `);

			if (theValue) {
				$$renderer.push('<!--[-->');
				theValue($$renderer, { count });
				$$renderer.push('<!--]-->');
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push('<!--]-->');
			}
		}
	);

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { thePromise, count, Component });
}