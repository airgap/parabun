import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let className = $.prop($$props, 'className', 12);

	var $$exports = {
		get className() {
			return className();
		},

		set className($$value) {
			className($$value);
			$.flush();
		}
	};

	var div = root();

	$.template_effect(() => $.set_class(div, 1, $.clsx(className())));
	$.append($$anchor, div);

	return $.pop($$exports);
}