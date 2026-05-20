import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<meta/>`);

export default function A($$anchor, $$props) {
	$.head('1lj1c2h', ($$anchor) => {
		var meta = root_1();

		$.template_effect(() => {
			$.set_attribute(meta, 'name', $$props.name);
			$.set_attribute(meta, 'content', $$props.content);
		});

		$.append($$anchor, meta);
	});
}