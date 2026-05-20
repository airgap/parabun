import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>foo</p>`);
var root_2 = $.from_html(`<p>not foo</p>`);
var root_3 = $.from_html(`<p>bar</p>`);
var root_4 = $.from_html(`<p>not bar</p>`);
var root = $.from_html(`<!> <!>`, 1);

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

	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		var alternate = ($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		};

		$.if(node, ($$render) => {
			if (foo()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			var p_2 = root_3();

			$.append($$anchor, p_2);
		};

		var alternate_1 = ($$anchor) => {
			var p_3 = root_4();

			$.append($$anchor, p_3);
		};

		$.if(node_1, ($$render) => {
			if (bar()) $$render(consequent_1); else $$render(alternate_1, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}