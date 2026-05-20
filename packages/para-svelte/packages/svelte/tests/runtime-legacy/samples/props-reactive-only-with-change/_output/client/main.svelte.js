import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Comp from './Comp.svelte';

var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let callback = $.prop($$props, 'callback', 12);
	let val1 = $.prop($$props, 'val1', 12);
	let val2 = $.prop($$props, 'val2', 12);

	var $$exports = {
		get callback() {
			return callback();
		},

		set callback($$value) {
			callback($$value);
			$.flush();
		},

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

	Comp(node, {
		id: '1',
		get callback() {
			return callback();
		},

		get value() {
			return val1();
		}
	});

	var node_1 = $.sibling(node, 2);

	Comp(node_1, {
		id: '2',
		get callback() {
			return callback();
		},

		get value() {
			return val2();
		}
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}