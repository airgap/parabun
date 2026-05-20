import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let testName = $.prop($$props, 'testName', 12);

	var $$exports = {
		get testName() {
			return testName();
		},

		set testName($$value) {
			testName($$value);
			$.flush();
		}
	};

	var div = root();

	$.template_effect(() => $.set_class(div, 1, $.clsx(testName())));
	$.append($$anchor, div);

	return $.pop($$exports);
}