import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let myClass = $.prop($$props, 'myClass', 12);

	var $$exports = {
		get myClass() {
			return myClass();
		},

		set myClass($$value) {
			myClass($$value);
			$.flush();
		}
	};

	var div = root();
	let classes;

	$.template_effect(() => classes = $.set_class(div, 1, $.clsx(myClass()), null, classes, { three: true }));
	$.append($$anchor, div);

	return $.pop($$exports);
}