import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Main($$anchor) {
	var input = root();

	input.readOnly = !0;
	input.required = !1;
	$.append($$anchor, input);
}