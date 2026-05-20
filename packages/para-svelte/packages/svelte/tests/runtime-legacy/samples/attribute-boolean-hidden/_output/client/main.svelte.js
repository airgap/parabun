import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let hidden = $.prop($$props, 'hidden', 12, false);

	var $$exports = {
		get hidden() {
			return hidden();
		},

		set hidden($$value) {
			hidden($$value);
			$.flush();
		}
	};

	var div = root();

	$.template_effect(() => $.set_attribute(div, 'hidden', hidden()));
	$.append($$anchor, div);

	return $.pop($$exports);
}