import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div id="both"></div> <div id="in"></div>`, 1);
var root_2 = $.from_html(`<div id="out"></div>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12, false);

	function foo(node, _params, options) {
		node.direction = options.direction;

		return { duration: 10 };
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
			var div_2 = root_2();

			$.transition(2, div_2, () => foo);
			$.append($$anchor, div_2);
		};

		$.if(node_2, ($$render) => {
			if (!visible()) $$render(consequent_1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}