import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	function foo() {
		console.log('foo');
	}

	const bar = () => console.log(value);
	var value;
	var $$promises = $.run([async () => value = await Promise.resolve('bar')]);
	var $$exports = { foo, bar };

	return $.pop($$exports);
}