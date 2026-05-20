import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Component2($$anchor) {
	$.next();

	var text = $.text('Component2');

	$.append($$anchor, text);
}