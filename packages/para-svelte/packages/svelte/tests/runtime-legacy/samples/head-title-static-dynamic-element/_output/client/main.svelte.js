import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<meta name="twitter:creator"/>`);

export default function Main($$anchor) {
	let x = 'sveltejs';

	$.head('70s021', ($$anchor) => {
		var meta = root_1();

		$.set_attribute(meta, 'content', '@sveltejs');

		$.effect(() => {
			$.document.title = 'changed';
		});

		$.append($$anchor, meta);
	});
}