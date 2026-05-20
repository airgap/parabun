import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>array.includes(primitive)</button> <button>array.includes(object)</button> <hr/> <button>array.indexOf(primitive)</button> <button>array.indexOf(object)</button> <hr/> <button>array.lastIndexOf(primitive)</button> <button>array.lastIndexOf(object)</button> <hr/> <button>clear</button>`, 1), Main[$.FILENAME], [
	[8, 0],
	[9, 0],
	[11, 0],
	[13, 0],
	[14, 0],
	[16, 0],
	[18, 0],
	[19, 0],
	[21, 0],
	[23, 0]
]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let primitive = 'foo';
	let object = {};
	let array = $.tag_proxy($.proxy([primitive, object]), 'array');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 4);
	var button_3 = $.sibling(button_2, 2);
	var button_4 = $.sibling(button_3, 4);
	var button_5 = $.sibling(button_4, 2);
	var button_6 = $.sibling(button_5, 4);

	$.delegated('click', button, function click() {
		return array.includes(primitive);
	});

	$.delegated('click', button_1, function click_1() {
		return array.includes(object);
	});

	$.delegated('click', button_2, function click_2() {
		return array.indexOf(primitive);
	});

	$.delegated('click', button_3, function click_3() {
		return array.indexOf(object);
	});

	$.delegated('click', button_4, function click_4() {
		return array.lastIndexOf(primitive);
	});

	$.delegated('click', button_5, function click_5() {
		return array.lastIndexOf(object);
	});

	$.delegated('click', button_6, function click_6() {
		return array.length = 0;
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);