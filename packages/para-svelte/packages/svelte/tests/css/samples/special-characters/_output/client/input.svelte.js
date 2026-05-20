import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<x class="svelte-xyz"></x>`);

export default function Input($$anchor) {
	var x = root();

	$.set_attribute(x, 'foo', '{;}');
	$.append($$anchor, x);
}