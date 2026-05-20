import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], 1);
		let bar = $$props['bar'];
		let _class = $$props['_class'];

		onMount(() => {
			foo = undefined;
		});

		$$renderer.push(`<div${$.attr('foo', foo)}${$.attr('bar', bar)}${$.attr_class($.clsx(_class))} draggable="false"></div>`);
		$.bind_props($$props, { foo, bar, _class });
	});
}