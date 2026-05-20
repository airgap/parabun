import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<button>remove</button>`);

export default function Main($$anchor) {
	let list = $.mutable_source(["a", "b", "c"]);

	const remove = (index) => {
		$.get(list).splice(index, 1);
		$.set(list, $.get(list));
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 3, () => $.get(list), (value) => value, ($$anchor, value, index) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				var button = root_2();

				$.event('click', button, (e) => remove($.get(index)));
				$.append($$anchor, button);
			};

			$.if(node_1, ($$render) => {
				if ($.get(value)) $$render(consequent);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}