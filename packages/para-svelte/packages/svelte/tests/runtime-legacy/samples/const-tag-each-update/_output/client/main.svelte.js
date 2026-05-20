import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> <!> <!></p>`);
var root = $.from_html(`<button>Show</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => ({ 0: { clicked: false }, length: 4 }));

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.each(node, 1, items, $.index, ($$anchor, item, i) => {
		const v_item = $.derived_safe_equal(() => $.get(item));
		var p = root_1();
		var text = $.child(p);

		text.nodeValue = `${i} `;

		var node_1 = $.sibling(text);

		{
			var consequent = ($$anchor) => {
				var text_1 = $.text('show (v_item)');

				$.append($$anchor, text_1);
			};

			$.if(node_1, ($$render) => {
				if ((
					$.deep_read_state($.get(v_item)),
					$.untrack(() => $.get(v_item)?.clicked)
				)) $$render(consequent);
			});
		}

		var node_2 = $.sibling(node_1, 2);

		{
			var consequent_1 = ($$anchor) => {
				var text_2 = $.text('show (item)');

				$.append($$anchor, text_2);
			};

			$.if(node_2, ($$render) => {
				if (($.get(item), $.untrack(() => $.get(item)?.clicked))) $$render(consequent_1);
			});
		}

		$.reset(p);
		$.append($$anchor, p);
	});

	$.event('click', button, () => {
		items(items()[0].clicked = true, true);
		items(items()[2] = { clicked: true }, true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}