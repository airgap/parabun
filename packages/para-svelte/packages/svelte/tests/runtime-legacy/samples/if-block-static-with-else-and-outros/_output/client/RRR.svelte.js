import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function RRR($$anchor) {
	$.next();

	var text = $.text('rrr');

	$.append($$anchor, text);
}