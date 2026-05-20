import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import InputOne from './InputOne.svelte';
import InputTwo from './InputTwo.svelte';

var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let val1 = $.prop($$props, 'val1', 12, '');
	let val2 = $.prop($$props, 'val2', 12, '');

	var $$exports = {
		get val1() {
			return val1();
		},

		set val1($$value) {
			val1($$value);
			$.flush();
		},

		get val2() {
			return val2();
		},

		set val2($$value) {
			val2($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	InputOne(node, {
		required: true,
		minlength: '10',
		get value() {
			return val1();
		},

		set value($$value) {
			val1($$value);
		},
		$$legacy: true
	});

	var node_1 = $.sibling(node, 2);

	InputTwo(node_1, {
		required: true,
		minlength: '10',
		get value() {
			return val2();
		},

		set value($$value) {
			val2($$value);
		},
		$$legacy: true
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}