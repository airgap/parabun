import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let promise = $.fallback($$props['promise'], () => Promise.resolve(), true);

	$.await(
		$$renderer,
		promise,
		() => {
			Widget($$renderer, {});
		},
		(result) => {
			Widget($$renderer, { value: result });
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise });
}