import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="not-match"><div></div></div> <div class="match svelte-xyz"><div class="svelte-xyz"></div> <div class="svelte-xyz"></div></div>`, 1);

export default function Input($$anchor) {
	var fragment = root();

	$.next(2);
	$.append($$anchor, fragment);
}