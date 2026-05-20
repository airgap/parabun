import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div><button> </button></div>`);
var root_1 = $.from_html(`<div> </div> <div> </div> <!>`, 1);
var root = $.from_html(`<main><!> <hr/> <div><button>Show / Hide</button></div></main>`);

export default function Main($$anchor) {
	const items = [
		{ id: 1, name: "a" },
		{ id: 2, name: "b" },
		{ id: 3, name: "c" },
		{ id: 4, name: "d" }
	];

	let currentId = $.state(1);
	let currentItem = $.derived(() => items.find((item) => item.id === $.get(currentId)));
	let visible = $.state(true);
	var main = root();
	var node = $.child(main);

	{
		var consequent = ($$anchor) => {
			var fragment = root_1();
			var div = $.first_child(fragment);
			var text = $.child(div);

			$.reset(div);

			var div_1 = $.sibling(div, 2);
			var text_1 = $.child(div_1);

			$.reset(div_1);

			var node_1 = $.sibling(div_1, 2);

			$.each(node_1, 17, () => items, $.index, ($$anchor, item) => {
				var div_2 = root_2();
				var button = $.child(div_2);
				var text_2 = $.child(button, true);

				$.reset(button);
				$.reset(div_2);
				$.template_effect(() => $.set_text(text_2, $.get(item).name));

				$.delegated('click', button, () => {
					$.set(currentId, $.get(item).id, true);
				});

				$.append($$anchor, div_2);
			});

			$.template_effect(() => {
				$.set_text(text, `Current ID: ${$.get(currentId) ?? ''}`);
				$.set_text(text_1, `Name: ${$.get(currentItem).name ?? ''}`);
			});

			$.append($$anchor, fragment);
		};

		$.if(node, ($$render) => {
			if ($.get(visible)) $$render(consequent);
		});
	}

	var div_3 = $.sibling(node, 4);
	var button_1 = $.child(div_3);

	$.reset(div_3);
	$.reset(main);

	$.delegated('click', button_1, () => {
		$.set(visible, !$.get(visible));
	});

	$.append($$anchor, main);
}

$.delegate(['click']);