import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Test($$anchor, $$props) {
	$.push($$props, false);

	const x = 42;
	var $$exports = { x };

	$.bind_prop($$props, 'x', x);

	return $.pop($$exports);
}