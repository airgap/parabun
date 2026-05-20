import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(
	`<div id="123" class="svelte-xyz"></div> <div id="line
break" class="svelte-xyz"></div> <div class="a🙂b svelte-xyz"></div> <div class="asdf svelte-xyz"></div> <div class="asdf svelte-xyz"></div> <div id="1" class="svelte-xyz"><span class="svelte-xyz"></span></div>`,
	1
);

export default function Input($$anchor) {
	var fragment = root();

	$.next(10);
	$.append($$anchor, fragment);
}