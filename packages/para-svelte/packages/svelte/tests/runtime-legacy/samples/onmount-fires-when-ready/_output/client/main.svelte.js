import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!> <!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	Widget(node, {});

	var node_1 = $.sibling(node, 2);

	{
		var consequent = ($$anchor) => {
			Widget($$anchor, {});
		};

		$.if(node_1, ($$render) => {
			if (foo()) $$render(consequent);
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}