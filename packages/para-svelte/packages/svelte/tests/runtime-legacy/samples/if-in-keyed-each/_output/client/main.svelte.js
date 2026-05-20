import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<li> </li>`);
var root = $.from_html(`<ul></ul>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 12);

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var ul = root();

	$.each(ul, 5, items, (item) => item.id, ($$anchor, item) => {
		var fragment = $.comment();
		var node = $.first_child(fragment);

		{
			var consequent = ($$anchor) => {
				var li = root_2();
				var text = $.child(li, true);

				$.reset(li);
				$.template_effect(() => $.set_text(text, ($.get(item), $.untrack(() => $.get(item).name))));
				$.append($$anchor, li);
			};

			$.if(node, ($$render) => {
				if (($.get(item), $.untrack(() => $.get(item).id))) $$render(consequent);
			});
		}

		$.append($$anchor, fragment);
	});

	$.reset(ul);
	$.append($$anchor, ul);

	return $.pop($$exports);
}