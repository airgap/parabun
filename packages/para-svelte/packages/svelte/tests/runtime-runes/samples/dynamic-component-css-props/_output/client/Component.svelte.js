import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="svelte-lsmn3l">Hello</div>`);

export default function Component($$anchor) {
	var div = root();

	$.append($$anchor, div);
}