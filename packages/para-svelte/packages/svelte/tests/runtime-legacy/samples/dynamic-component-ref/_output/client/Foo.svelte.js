import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	const test = true;
	var $$exports = { test };

	$.next();

	var text = $.text('Foo');

	$.append($$anchor, text);
	$.bind_prop($$props, 'test', test);

	return $.pop($$exports);
}