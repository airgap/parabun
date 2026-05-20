import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];

	$.await($$renderer, thePromise, () => {}, () => {
		$$renderer.push(`<p>the promise is resolved</p>`);
	});

	$$renderer.push(`<!--]--> <br/> `);

	$.await($$renderer, thePromise, () => {}, () => {
		$$renderer.push(`<p>the promise is resolved</p>`);
	});

	$$renderer.push(`<!--]--> <br/> `);

	$.await(
		$$renderer,
		thePromise,
		() => {
			$$renderer.push(`<p>the promise is pending</p>`);
		},
		() => {
			$$renderer.push(`<p>the promise is resolved</p>`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}