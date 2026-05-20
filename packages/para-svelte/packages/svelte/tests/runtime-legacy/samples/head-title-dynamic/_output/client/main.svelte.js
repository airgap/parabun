import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<meta name="twitter:creator" content="@sveltejs"/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let adjective = $.prop($$props, 'adjective', 12);

	var $$exports = {
		get adjective() {
			return adjective();
		},

		set adjective($$value) {
			adjective($$value);
			$.flush();
		}
	};

	$.head('70s021', ($$anchor) => {
		var meta = root_1();

		$.deferred_template_effect(() => {
			$.document.title = `a ${adjective() ?? ''} title`;
		});

		$.append($$anchor, meta);
	});

	return $.pop($$exports);
}