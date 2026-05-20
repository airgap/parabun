import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div contenteditable="false"> </div>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let text = $.prop($$props, 'text', 12, '');

	const updater = (event) => {
		text(event.target.textContent);
	};

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
	var text_1 = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text_1, text()));
	$.event('input', div, updater);
	$.append($$anchor, div);

	return $.pop($$exports);
}