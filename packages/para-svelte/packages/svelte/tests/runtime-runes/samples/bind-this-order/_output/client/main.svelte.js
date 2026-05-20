import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<nav>hello</nav>`);
var root = $.from_html(`<button>toggle</button> <!>`, 1);

export default function Main($$anchor) {
	function fly(node, params) {
		return {};
	}

	let show = $.state(false);
	let sidebar = $.state(void 0);
	var fragment = root();
	var button = $.first_child(fragment);
	var node_1 = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var nav = root_1();

			$.bind_this(nav, ($$value) => $.set(sidebar, $$value), () => $.get(sidebar));
			$.transition(3, nav, () => fly, () => ({ x: $.get(sidebar).offsetWidth }));
			$.append($$anchor, nav);
		};

		$.if(node_1, ($$render) => {
			if ($.get(show)) $$render(consequent);
		});
	}

	$.delegated('click', button, () => $.set(show, !$.get(show)));
	$.append($$anchor, fragment);
}

$.delegate(['click']);