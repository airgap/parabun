import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><span></span></div>`);

export default function Input($$anchor) {
	var //
	div = root();

	$.set_attribute(div, 'data-active', false);
	$.append($$anchor, div);
}