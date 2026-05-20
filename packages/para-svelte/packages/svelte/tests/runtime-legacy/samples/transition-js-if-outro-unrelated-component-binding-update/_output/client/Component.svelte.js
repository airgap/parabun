import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);
var root = $.from_html(`<button></button> <button></button> <!>`, 1);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let condition = $.prop($$props, 'condition', 12);

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	let bool = $.mutable_source(true);

	var $$exports = {
		get condition() {
			return condition();
		},

		set condition($$value) {
			condition($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node_1 = $.sibling(button_1, 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(2, div, () => foo);
			$.append($$anchor, div);
		};

		$.if(node_1, ($$render) => {
			if ($.get(bool)) $$render(consequent);
		});
	}

	$.event('click', button, () => condition(false));
	$.event('click', button_1, () => $.set(bool, !$.get(bool)));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}