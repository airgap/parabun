import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<link rel="canonical" href="/"/> <meta name="description" content="some description"/> <meta name="keywords" content="some keywords"/>`, 1);
var root = $.from_html(`<div>Just a dummy page.</div>`);

export default function Main($$anchor) {
	var div = root();

	$.head('r55nhh', ($$anchor) => {
		var fragment = root_1();

		$.next(4);

		$.effect(() => {
			$.document.title = 'Some Title';
		});

		$.append($$anchor, fragment);
	});

	$.append($$anchor, div);
}