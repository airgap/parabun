import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root_3 = $.from_html(`<div></div>`);
var root_4 = $.from_html(`<div></div>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, true);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Component($$anchor, {});
		};

		var alternate = ($$anchor) => {
			Component($$anchor, {});
		};

		$.if(node, ($$render) => {
			if (foo()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			var div = root_3();

			$.append($$anchor, div);
		};

		var alternate_1 = ($$anchor) => {
			var div_1 = root_4();

			$.append($$anchor, div_1);
		};

		$.if(node_1, ($$render) => {
			if (foo()) $$render(consequent_1); else $$render(alternate_1, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}