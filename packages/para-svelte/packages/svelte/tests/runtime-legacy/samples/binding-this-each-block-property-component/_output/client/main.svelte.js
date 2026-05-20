import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12, false);
	let items = $.prop($$props, 'items', 28, () => [{ value: 'a', ref: null }]);

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		},

		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.each(node_1, 1, items, $.index, ($$anchor, item, $$index) => {
				$.bind_this(
					Foo($$anchor, {
						children: ($$anchor, $$slotProps) => {
							$.next();

							var text = $.text();

							$.template_effect(() => $.set_text(text, ($.get(item), $.untrack(() => $.get(item).value))));
							$.append($$anchor, text);
						},
						$$slots: { default: true },
						$$legacy: true
					}),
					($$value, item) => (
						item.ref = $$value,
						$.invalidate_inner_signals(() => (items()))
					),
					(item) => item?.ref,
					() => [$.get(item)]
				);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}