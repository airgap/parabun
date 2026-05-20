import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => [
		{
			title: 'a title',
			data: new Promise((f) => {
				f(42);
			})
		}
	]);

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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, items, $.index, ($$anchor, item) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.await(
			node_1,
			() => ($.get(item), $.untrack(() => $.get(item).data)),
			($$anchor) => {
				var p_1 = root_3();
				var text_1 = $.child(p_1);

				$.reset(p_1);
				$.template_effect(() => $.set_text(text_1, `${($.get(item), $.untrack(() => $.get(item).title)) ?? ''}: loading...`));
				$.append($$anchor, p_1);
			},
			($$anchor, result) => {
				var p = root_2();
				var text = $.child(p);

				$.reset(p);
				$.template_effect(() => $.set_text(text, `${($.get(item), $.untrack(() => $.get(item).title)) ?? ''}: ${$.get(result) ?? ''}`));
				$.append($$anchor, p);
			}
		);

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}