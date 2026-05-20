import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<foo-bar>Hello</foo-bar>`, 2);

export default function Main($$anchor) {
	var foo_bar = root();

	$.append($$anchor, foo_bar);
}