import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_svg(`<g class="foo"></g>`);
var root_2 = $.from_svg(`<g class="bar"></g>`);
var root = $.from_svg(`<svg><!><!></svg>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let bar = $.prop($$props, 'bar', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		}
	};

	var svg = root();
	var node = $.child(svg);

	$.each(node, 1, foo, $.index, ($$anchor, x) => {
		var g = root_1();

		$.append($$anchor, g);
	});

	var node_1 = $.sibling(node);

	$.each(node_1, 1, bar, $.index, ($$anchor, y) => {
		var g_1 = root_2();

		$.append($$anchor, g_1);
	});

	$.reset(svg);
	$.append($$anchor, svg);

	return $.pop($$exports);
}