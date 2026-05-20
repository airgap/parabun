import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> <hr/> <!></div>`);

export default function Nested2($$anchor, $$props) {
	$.push($$props, false);

	let text = $.prop($$props, 'text', 12);

	var $$exports = {
		get text() {
			return text();
		},

		set text($$value) {
			text($$value);
			$.flush();
		}
	};

	var div = root();
	var text_1 = $.child(div);
	var node = $.sibling(text_1, 3);

	$.slot(node, $$props, 'footer', {}, null);
	$.reset(div);
	$.template_effect(() => $.set_text(text_1, `${text() ?? ''} `));
	$.append($$anchor, div);

	return $.pop($$exports);
}