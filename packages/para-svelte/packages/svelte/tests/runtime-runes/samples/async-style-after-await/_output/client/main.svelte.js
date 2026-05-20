import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div> <div></div> <button>width</button>`, 1);
var root_2 = $.from_html(`<div></div> <div></div> <button>width</button>`, 1);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor) {
	var // static
		color,
		// dynamic
		width;

	var $$promises = $.run([
		() => Promise.resolve(),
		() => {
			color = 'red';
			width = $.state('100px');
		}
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[1]], void 0, (node) => {
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var div = $.first_child(fragment_1);
			let styles;
			var div_1 = $.sibling(div, 2);
			let styles_1;
			var button = $.sibling(div_1, 2);

			$.template_effect(
				() => {
					styles = $.set_style(div, '', styles, { color });
					styles_1 = $.set_style(div_1, '', styles_1, { width: $.get(width) });
				},
				void 0,
				void 0,
				[$$promises[1], $$promises[1]]
			);

			$.delegated('click', button, () => $.set(width, '1px'));
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (color) $$render(consequent);
		});
	});

	var node_1 = $.sibling(node, 2);

	$.async(node_1, [$$promises[1]], void 0, (node_1) => {
		var consequent_1 = ($$anchor) => {
			var fragment_2 = root_2();
			var div_2 = $.first_child(fragment_2);
			let styles_2;
			var div_3 = $.sibling(div_2, 2);
			let styles_3;
			var button_1 = $.sibling(div_3, 2);

			$.template_effect(
				() => {
					styles_2 = $.set_style(div_2, '', styles_2, { color });
					styles_3 = $.set_style(div_3, '', styles_3, { width: $.get(width) });
				},
				void 0,
				void 0,
				[$$promises[1], $$promises[1]]
			);

			$.delegated('click', button_1, () => $.set(width, '1px'));
			$.append($$anchor, fragment_2);
		};

		$.if(node_1, ($$render) => {
			if (color) $$render(consequent_1);
		});
	});

	$.append($$anchor, fragment);
}

$.delegate(['click']);