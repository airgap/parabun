import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input disabled="" hidden=""/>`);

export default function Main($$anchor) {
	var input = root();

	$.append($$anchor, input);
}