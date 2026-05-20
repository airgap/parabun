import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];
	let error = $$props['error'];

	$$renderer.push(`<div>error: ${$.escape(error)} `);

	$.await($$renderer, thePromise, () => {}, (_) => {
		$$renderer.push(`After Resolve: ${$.escape(error)}`);
	});

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { thePromise, error });
}