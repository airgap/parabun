import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div>foo</div>`);
var root_3 = $.from_html(`<div>bar</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let array = $.prop($$props, 'array', 12);

	var $$exports = {
		get array() {
			return array();
		},

		set array($$value) {
			array($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, array, $.index, ($$anchor, item) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				var div = root_2();

				$.append($$anchor, div);
			};

			var alternate = ($$anchor) => {
				var div_1 = root_3();

				$.append($$anchor, div_1);
			};

			$.if(node_1, ($$render) => {
				if ($.get(item)) $$render(consequent); else $$render(alternate, -1);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}