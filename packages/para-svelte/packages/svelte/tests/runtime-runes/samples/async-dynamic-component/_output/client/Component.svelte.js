import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Component($$anchor) {
	$.next();

	var text = $.text('Hi');

	$.append($$anchor, text);
}