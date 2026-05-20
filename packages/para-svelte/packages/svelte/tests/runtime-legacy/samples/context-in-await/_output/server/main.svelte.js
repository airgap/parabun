import * as $ from 'svelte/internal/server';
import { setContext } from 'svelte';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		setContext('test', 123);

		let promise = $.fallback($$props['promise'], () => Promise.resolve(), true);

		$.await(
			$$renderer,
			promise,
			() => {
				$$renderer.push(`<p>...waiting</p>`);
			},
			() => {
				Child($$renderer, {});
			}
		);

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { promise });
	});
}