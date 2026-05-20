import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div> </div>`);
var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let fruits = $.prop($$props, 'fruits', 12);

	var $$exports = {
		get fruits() {
			return fruits();
		},

		set fruits($$value) {
			fruits($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	{
		var consequent = ($$anchor) => {
			var fragment = $.comment();
			var node_1 = $.first_child(fragment);

			$.each(node_1, 1, fruits, (fruit) => fruit, ($$anchor, fruit) => {
				var div_1 = root_2();
				var text = $.child(div_1, true);

				$.reset(div_1);
				$.template_effect(() => $.set_text(text, $.get(fruit)));
				$.append($$anchor, div_1);
			});

			$.append($$anchor, fragment);
		};

		$.if(node, ($$render) => {
			if (fruits()) $$render(consequent);
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}