import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div> <div></div>`, 1);
var root = $.from_html(`<div></div> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let id = $.prop($$props, 'id', 12);

	var $$exports = {
		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var node = $.sibling(div, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var div_1 = $.first_child(fragment_1);
			var div_2 = $.sibling(div_1, 2);

			$.template_effect(() => {
				$.set_attribute(div_1, 'id', id());
				$.set_attribute(div_2, 'id', id());
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	$.template_effect(() => $.set_attribute(div, 'id', id()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}