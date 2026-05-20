import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<span class="name"> </span>`);
var root_1 = $.from_html(`<div><!> <span>something</span></div>`);
var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let sortById = $.prop($$props, 'sortById', 12, true);

	let items = $.mutable_source([
		{ id: 1, name: "item 1", value: 3 },
		{ id: 2, name: "item 2", value: 2 },
		{ id: 3, name: "item 3", value: 1 }
	]);

	$.legacy_pre_effect(() => ($.get(items), $.deep_read_state(sortById())), () => {
		$.set(items, $.get(items).sort((a, b) => {
			return sortById() ? a.id - b.id : a.value - b.value;
		}));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get sortById() {
			return sortById();
		},

		set sortById($$value) {
			sortById($$value);
			$.flush();
		}
	};

	var div = root();

	$.each(div, 5, () => $.get(items), (item) => item.id, ($$anchor, item) => {
		var div_1 = root_1();
		var node = $.child(div_1);

		{
			var consequent = ($$anchor) => {
				var span = root_2();
				var text = $.child(span, true);

				$.reset(span);
				$.template_effect(() => $.set_text(text, ($.get(item), $.untrack(() => $.get(item).name))));
				$.append($$anchor, span);
			};

			$.if(node, ($$render) => {
				if (($.get(item), $.untrack(() => $.get(item).name))) $$render(consequent);
			});
		}

		$.next(2);
		$.reset(div_1);
		$.append($$anchor, div_1);
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}