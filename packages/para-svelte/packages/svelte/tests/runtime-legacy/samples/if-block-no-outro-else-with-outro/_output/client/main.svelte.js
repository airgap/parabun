import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root_1 = $.from_html(`<p>foo</p>`);
var root_2 = $.from_html(`<!> <p> </p> <input type="text"/>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let x = $.prop($$props, 'x', 12, 'x');

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		var alternate = ($$anchor) => {
			var fragment_1 = root_2();
			var node_1 = $.first_child(fragment_1);

			Widget(node_1, {});

			var p_1 = $.sibling(node_1, 2);
			var text = $.child(p_1, true);

			$.reset(p_1);

			var input = $.sibling(p_1, 2);

			$.remove_input_defaults(input);
			$.template_effect(() => $.set_text(text, x()));
			$.bind_value(input, x);
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (foo()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}