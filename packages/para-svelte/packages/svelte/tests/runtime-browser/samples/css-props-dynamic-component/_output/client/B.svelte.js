import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="svelte-1xyo1vb">b</div>`);

export default function _unknown_($$anchor) {
	var div = root();

	$.append($$anchor, div);
}