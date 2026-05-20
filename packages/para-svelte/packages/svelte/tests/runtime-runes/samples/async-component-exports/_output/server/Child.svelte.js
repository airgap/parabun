import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	function foo() {
		console.log('foo');
	}

	const bar = () => console.log(value);
	var value;
	var $$promises = $$renderer.run([async () => value = await Promise.resolve('bar')]);

	$.bind_props($$props, { foo, bar });
}