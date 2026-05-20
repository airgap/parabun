import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<meta name="description" content="A"/>`);

export default function A($$anchor) {
	$.next();

	var text = $.text('A');

	$.head('1lj1c2h', ($$anchor) => {
		var meta = root_1();

		$.append($$anchor, meta);
	});

	$.append($$anchor, text);
}