import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<!><!>`, 1);

export default function ParentWidget($$anchor, $$props) {
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

	var fragment = root();
	var node = $.first_child(fragment);

	Widget(node, {});

	var node_1 = $.sibling(node);

	{
		var consequent = ($$anchor) => {
			Widget($$anchor, {});
		};

		$.if(node_1, ($$render) => {
			if (foo()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}