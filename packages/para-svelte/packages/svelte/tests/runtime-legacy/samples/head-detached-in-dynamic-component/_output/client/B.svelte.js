import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<meta name="description" content="B"/>`);

export default function B($$anchor) {
	$.next();

	var text = $.text('B');

	$.head('1lj1c2i', ($$anchor) => {
		var meta = root_1();

		$.append($$anchor, meta);
	});

	$.append($$anchor, text);
}