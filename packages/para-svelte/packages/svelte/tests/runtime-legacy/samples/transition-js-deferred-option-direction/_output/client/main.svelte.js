import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div id="both-in"></div> <div id="in"></div>`, 1);
var root_2 = $.from_html(`<div id="out"></div> <div id="both-out"></div>`, 1);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);

	function foo(node, _params, options) {
		node.directions = options.direction;

		return (opts) => {
			node.directions += "," + opts.direction;

			return { duration: 10 };
		};
	}

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var div = $.first_child(fragment_1);
			var div_1 = $.sibling(div, 2);

			$.transition(3, div, () => foo);
			$.transition(1, div_1, () => foo);
			$.append($$anchor, fragment_1);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	var node_2 = $.sibling(node_1, 2);

	{
		var consequent_1 = ($$anchor) => {
			var fragment_2 = root_2();
			var div_2 = $.first_child(fragment_2);
			var div_3 = $.sibling(div_2, 2);

			$.transition(2, div_2, () => foo);
			$.transition(3, div_3, () => foo, () => ({ duration: 500 }));
			$.append($$anchor, fragment_2);
		};

		$.if(node_2, ($$render) => {
			if (!visible()) $$render(consequent_1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}