import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function IconA($$anchor) {
	$.next();

	var text = $.text('Icon A');

	$.append($$anchor, text);
}