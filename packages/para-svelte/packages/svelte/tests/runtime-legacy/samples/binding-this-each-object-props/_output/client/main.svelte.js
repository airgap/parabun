import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div> <div> </div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const items1 = $.mutable_source({});
	const items2 = $.mutable_source({});
	let data = $.prop($$props, 'data', 28, () => [{ id: 1, text: "b" }, { id: 2, text: "c" }]);

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
		},

		get data() {
			return data();
		},

		set data($$value) {
			data($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, data, (item) => item.id, ($$anchor, item) => {
		var fragment_1 = root_1();
		var div = $.first_child(fragment_1);
		var text = $.child(div, true);

		$.reset(div);
		$.bind_this(div, ($$value, item) => $.mutate(items1, $.get(items1)[item.id] = $$value), (item) => $.get(items1)?.[item.id], () => [$.get(item)]);

		var div_1 = $.sibling(div, 2);
		var text_1 = $.child(div_1, true);

		$.reset(div_1);
		$.bind_this(div_1, ($$value, item) => $.mutate(items2, $.get(items2)[item.id] = $$value), (item) => $.get(items2)?.[item.id], () => [$.get(item)]);

		$.template_effect(() => {
			$.set_text(text, ($.get(item), $.untrack(() => $.get(item).text)));
			$.set_text(text_1, ($.get(item), $.untrack(() => $.get(item).text)));
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'items1', $.get(items1));
	$.bind_prop($$props, 'items2', $.get(items2));

	return $.pop($$exports);
}