import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Component1($$anchor) {
	$.next();

	var text = $.text('Component1');

	$.append($$anchor, text);
}