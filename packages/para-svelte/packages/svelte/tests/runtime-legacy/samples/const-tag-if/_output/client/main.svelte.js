import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let boxes = $.prop($$props, 'boxes', 12);

	var $$exports = {
		get boxes() {
			return boxes();
		},

		set boxes($$value) {
			boxes($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			const box = $.derived_safe_equal(() => ($.deep_read_state(boxes()), $.untrack(() => boxes()[0])));

			const computed_const = $.derived_safe_equal(() => {
				const { width, height } = $.get(box);

				return { width, height };
			});

			var div = root_1();
			var text = $.child(div);

			$.reset(div);
			$.template_effect(() => $.set_text(text, `${$.get(computed_const).width ?? ''} x ${$.get(computed_const).height ?? ''}`));
			$.append($$anchor, div);
		};

		$.if(node, ($$render) => {
			if ((
				$.deep_read_state(boxes()),
				$.untrack(() => boxes().length > 0)
			)) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}