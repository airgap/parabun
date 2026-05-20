import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p class="foo bar svelte-1w4x538">red on black</p>`);

export default function Widget($$anchor) {
	var p = root();

	$.append($$anchor, p);
}