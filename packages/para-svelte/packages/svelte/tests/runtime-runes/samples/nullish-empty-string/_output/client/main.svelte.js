import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	$.next();

	var text = $.text();

	text.nodeValue = '[]';
	$.append($$anchor, text);
}