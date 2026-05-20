import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer) {
	var value;
	var $$promises = $$renderer.run([() => Promise.resolve(), () => value = 'value']);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		Child($$renderer, { value });
	});

	$$renderer.push(` `);

	$$renderer.async([$$promises[1]], ($$renderer) => {
		$$renderer.push(`<div${$.attr_class($.clsx(value))}></div>`);
	});
}