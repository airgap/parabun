import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let testName1 = $.prop($$props, 'testName1', 12);
	let testName2 = $.prop($$props, 'testName2', 12);

	function myHelper(testName) {
		return testName;
	}

	var $$exports = {
		get testName1() {
			return testName1();
		},

		set testName1($$value) {
			testName1($$value);
			$.flush();
		},

		get testName2() {
			return testName2();
		},

		set testName2($$value) {
			testName2($$value);
			$.flush();
		}
	};

	var div = root();

	$.template_effect(($0) => $.set_class(div, 1, $0), [
		() => (
			$.deep_read_state(testName1()),
			$.deep_read_state(testName2()),
			$.untrack(() => myHelper(testName1()) + myHelper(testName2()))
		)
	]);

	$.append($$anchor, div);

	return $.pop($$exports);
}