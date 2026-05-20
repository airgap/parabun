import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Main($$anchor) {
	function test() {}

	var input = root();

	$.autofocus(input, test());
	$.append($$anchor, input);
}