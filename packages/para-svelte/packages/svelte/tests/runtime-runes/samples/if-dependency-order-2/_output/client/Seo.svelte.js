import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Seo($$anchor, $$props) {
	$.push($$props, true);

	var p = root();

	$.head('n5115z', ($$anchor) => {
		$.deferred_template_effect(() => {
			$.document.title = $$props.post.title ?? '';
		});
	});

	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $$props.post.title));
	$.append($$anchor, p);
	$.pop();
}