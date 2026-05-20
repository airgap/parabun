import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<textarea readonly=""></textarea>`);

export default function Main($$anchor) {
	var textarea = root();

	$.append($$anchor, textarea);
}