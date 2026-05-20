import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<main>test</main>`);

export default function Main($$anchor) {
	var main = root();

	$.append($$anchor, main);
}