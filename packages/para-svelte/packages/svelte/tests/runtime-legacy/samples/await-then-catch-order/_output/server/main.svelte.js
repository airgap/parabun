import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

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

	$$renderer.push(`<!--]--> `);

	if (true) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>true!</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}