import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function IconB($$anchor) {
	$.next();

	var text = $.text('Icon B');

	$.append($$anchor, text);
}