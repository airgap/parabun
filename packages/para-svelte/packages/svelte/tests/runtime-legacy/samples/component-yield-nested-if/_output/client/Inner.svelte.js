import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Inner($$anchor) {
	$.next();

	var text = $.text('Inner');

	$.append($$anchor, text);
}