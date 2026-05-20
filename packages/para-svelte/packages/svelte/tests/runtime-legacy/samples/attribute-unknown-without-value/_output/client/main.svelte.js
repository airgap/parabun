import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div potato=""></div>`);

export default function Main($$anchor) {
	var div = root();

	$.append($$anchor, div);
}