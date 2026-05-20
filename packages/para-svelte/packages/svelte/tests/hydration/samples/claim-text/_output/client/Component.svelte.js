import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<main>There should be one</main>`);

export default function Component($$anchor) {
	var main = root();

	$.head('1wdpkwr', ($$anchor) => {
		$.effect(() => {
			$.document.title = 'Title';
		});
	});

	$.append($$anchor, main);
}