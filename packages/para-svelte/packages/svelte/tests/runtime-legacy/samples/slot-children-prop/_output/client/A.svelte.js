import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(` <!>`, 1);

export default function A($$anchor, $$props) {
	$.push($$props, false);

	let children = $.prop($$props, 'children', 12);

	var $$exports = {
		get children() {
			return children();
		},

		set children($$value) {
			children($$value);
			$.flush();
		}
	};

	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var node = $.sibling(text);

	$.slot(node, $$props, 'default', {}, null);
	$.template_effect(() => $.set_text(text, `${children() ?? ''} `));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}