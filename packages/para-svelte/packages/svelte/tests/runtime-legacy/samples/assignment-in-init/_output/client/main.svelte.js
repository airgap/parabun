import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo;
	let bar = (foo = 1) * 2;
	const get_foo = () => foo;
	const get_bar = () => bar;
	var $$exports = { get_foo, get_bar };

	$.bind_prop($$props, 'get_foo', get_foo);
	$.bind_prop($$props, 'get_bar', get_bar);

	return $.pop($$exports);
}