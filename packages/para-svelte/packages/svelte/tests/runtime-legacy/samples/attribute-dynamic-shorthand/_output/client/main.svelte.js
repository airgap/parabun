import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let id = $.prop($$props, 'id', 12, 'foo');

	var $$exports = {
		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		}
	};

	var div = root();

	$.template_effect(() => $.set_attribute(div, 'id', id()));
	$.append($$anchor, div);

	return $.pop($$exports);
}