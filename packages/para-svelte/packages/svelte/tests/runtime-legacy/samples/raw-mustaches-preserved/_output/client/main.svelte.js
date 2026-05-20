import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let raw = $.prop($$props, 'raw', 12);

	var $$exports = {
		get raw() {
			return raw();
		},

		set raw($$value) {
			raw($$value);
			$.flush();
		}
	};

	var div = root();

	$.html(div, raw, true);
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}