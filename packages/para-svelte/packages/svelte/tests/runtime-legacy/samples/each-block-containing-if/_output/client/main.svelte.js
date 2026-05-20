import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<li> </li>`);
var root = $.from_html(`<ul></ul>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => [
		{ description: 'one', completed: false },
		{ description: 'two', completed: false },
		{ description: 'three', completed: false }
	]);

	let currentFilter = $.prop($$props, 'currentFilter', 12, 'completed');

	function filter(item, currentFilter) {
		if (currentFilter === 'all') return true;
		if (currentFilter === 'completed') return item.completed;
		if (currentFilter === 'active') return !item.completed;
	}

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		},

		get currentFilter() {
			return currentFilter();
		},

		set currentFilter($$value) {
			currentFilter($$value);
			$.flush();
		}
	};

	var ul = root();

	$.each(ul, 5, items, $.index, ($$anchor, item) => {
		var fragment = $.comment();
		var node = $.first_child(fragment);

		{
			var consequent = ($$anchor) => {
				var li = root_2();
				var text = $.child(li, true);

				$.reset(li);
				$.template_effect(() => $.set_text(text, ($.get(item), $.untrack(() => $.get(item).description))));
				$.append($$anchor, li);
			};

			var d = $.derived(() => (
				$.get(item),
				$.deep_read_state(currentFilter()),
				$.untrack(() => filter($.get(item), currentFilter()))
			));

			$.if(node, ($$render) => {
				if ($.get(d)) $$render(consequent);
			});
		}

		$.append($$anchor, fragment);
	});

	$.reset(ul);
	$.append($$anchor, ul);

	return $.pop($$exports);
}