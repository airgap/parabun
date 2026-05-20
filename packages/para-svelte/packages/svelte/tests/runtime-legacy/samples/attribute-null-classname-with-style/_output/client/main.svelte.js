import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let testName = $.prop($$props, 'testName', 12);

	function _() {
		// Make the prop a source. Difference from Svelte 4.
		testName('');
	}

	var $$exports = {
		_,
		get testName() {
			return testName();
		},

		set testName($$value) {
			testName($$value);
			$.flush();
		}
	};

	var div = root();

	$.template_effect(() => $.set_class(div, 1, $.clsx(testName()), 'svelte-70s021'));
	$.append($$anchor, div);
	$.bind_prop($$props, '_', _);

	return $.pop($$exports);
}