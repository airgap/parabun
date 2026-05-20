import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Component($$anchor, $$props) {
	$.push($$props, true);

	const label = $.prop($$props, 'label', 3, 0),
		size = $.prop($$props, 'size', 3, 0);

	const title = $.derived(() => size().toString());
	var p = root();
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(() => {
		$.set_attribute(p, 'title', $.get(title));
		$.set_text(text, label());
	});

	$.append($$anchor, p);
	$.pop();
}