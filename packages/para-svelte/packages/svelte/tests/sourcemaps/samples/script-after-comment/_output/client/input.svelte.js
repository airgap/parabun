import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Input($$anchor) {
	function assertThisLine() {}

	$.next();

	var text = $.text();

	text.nodeValue = foo.bar.baz;
	$.append($$anchor, text);
}