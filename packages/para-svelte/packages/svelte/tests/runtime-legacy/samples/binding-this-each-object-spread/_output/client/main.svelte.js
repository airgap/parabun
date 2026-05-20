import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div> <div> </div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const items1 = $.mutable_source({});
	const items2 = $.mutable_source({});
	let data = [{ id: 1, text: "a" }, { id: 2, text: "b" }];

	var $$exports = {
		get items1() {
			return $.get(items1);
		},

		set items1($$value) {
			$.set(items1, $.proxy($$value));
		},

		get items2() {
			return $.get(items2);
		},

		set items2($$value) {
			$.set(items2, $.proxy($$value));
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => data, ({ id, text }) => id, ($$anchor, $$item) => {
		let id = () => $.get($$item).id;
		let text = () => $.get($$item).text;
		var fragment_1 = root_1();
		var div = $.first_child(fragment_1);
		var text_1 = $.child(div, true);

		$.reset(div);
		$.bind_this(div, ($$value, id) => $.mutate(items1, $.get(items1)[id] = $$value), (id) => $.get(items1)?.[id], () => [id()]);

		var div_1 = $.sibling(div, 2);
		var text_2 = $.child(div_1, true);

		$.reset(div_1);
		$.bind_this(div_1, ($$value, id) => $.mutate(items2, $.get(items2)[id] = $$value), (id) => $.get(items2)?.[id], () => [id()]);

		$.template_effect(() => {
			$.set_text(text_1, text());
			$.set_text(text_2, text());
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'items1', $.get(items1));
	$.bind_prop($$props, 'items2', $.get(items2));

	return $.pop($$exports);
}