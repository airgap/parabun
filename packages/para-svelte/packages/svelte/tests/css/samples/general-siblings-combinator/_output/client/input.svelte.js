import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="a svelte-xyz"><span class="svelte-xyz"></span> <b class="svelte-xyz"></b></div> <article class="b svelte-xyz"></article> <p class="c svelte-xyz"></p> <details class="d svelte-xyz"></details>`, 1);

export default function Input($$anchor) {
	var fragment = root();

	$.next(6);
	$.append($$anchor, fragment);
}