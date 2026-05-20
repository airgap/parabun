import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);
var root = $.from_html(`<button>toggle</button> <!>`, 1);

export default function Main($$anchor) {
	let visible = $.mutable_source(false);

	function foo() {
		return {
			duration: 100,
			css: (t) => {
				return `scale: ${t}`;
			},

			tick: (t) => {
				console.log(`tick: ${t}`);
			}
		};
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(3, div, () => foo);
			$.append($$anchor, div);
		};

		$.if(node, ($$render) => {
			if ($.get(visible)) $$render(consequent);
		});
	}

	$.event('click', button, () => $.set(visible, !$.get(visible)));
	$.append($$anchor, fragment);
}