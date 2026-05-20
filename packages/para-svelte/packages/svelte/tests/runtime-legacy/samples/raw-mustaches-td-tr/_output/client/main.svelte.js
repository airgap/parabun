import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<table><tbody><tr><td>5</td><td>7</td></tr><!></tbody></table>`);

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

	var table = root();
	var tbody = $.child(table);
	var node = $.sibling($.child(tbody));

	$.html(node, raw);
	$.reset(tbody);
	$.reset(table);
	$.append($$anchor, table);

	return $.pop($$exports);
}