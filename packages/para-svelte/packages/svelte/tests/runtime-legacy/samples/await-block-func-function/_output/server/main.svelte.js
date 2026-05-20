import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let thePromise = $$props['thePromise'];

		$.await(
			$$renderer,
			thePromise,
			() => {
				$$renderer.push(`Waiting...`);
			},
			({ func }) => {
				$$renderer.push(`${$.escape((() => func)())}`);
			}
		);

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { thePromise });
	});
}