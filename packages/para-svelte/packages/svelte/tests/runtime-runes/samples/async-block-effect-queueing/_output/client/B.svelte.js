import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function B($$anchor) {
	$.next();

	var text = $.text('B');

	$.append($$anchor, text);
}