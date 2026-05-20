import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="a svelte-xyz"><div class="a svelte-xyz"></div> <div class="b svelte-xyz"><div class="c svelte-xyz"></div></div> <div class="d svelte-xyz"></div></div> <div class="container svelte-xyz"><div class="a svelte-xyz"></div></div>`, 1);

export default function Input($$anchor) {
	var fragment = root();

	$.next(2);
	$.append($$anchor, fragment);
}