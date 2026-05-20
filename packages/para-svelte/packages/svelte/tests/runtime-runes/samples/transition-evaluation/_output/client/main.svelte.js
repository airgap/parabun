import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	const visible = $.prop($$props, 'visible', 3, true),
		foo = $.prop($$props, 'foo', 3, 1);

	function bar(node, params) {
		node.foo = params;

		return () => ({});
	}

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(3, div, () => bar, foo);
			$.append($$anchor, div);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
}