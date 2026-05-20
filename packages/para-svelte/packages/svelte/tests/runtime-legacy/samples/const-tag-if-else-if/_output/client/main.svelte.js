import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div> <div> </div>`, 1);
var root_2 = $.from_html(`<div> </div>`);
var root_3 = $.from_html(`<div> </div> <div> </div>`, 1);
var root_4 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <!>`, 1);

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

	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			const box1 = $.derived_safe_equal(() => ($.deep_read_state(boxes()), $.untrack(() => boxes()[0])));
			const box2 = $.derived_safe_equal(() => ($.deep_read_state(boxes()), $.untrack(() => boxes()[1])));

			const computed_const = $.derived_safe_equal(() => {
				const { width, height } = $.get(box1);

				return { width, height };
			});

			var fragment_1 = root_1();
			var div = $.first_child(fragment_1);
			var text = $.child(div);

			$.reset(div);

			var div_1 = $.sibling(div, 2);
			var text_1 = $.child(div_1);

			$.reset(div_1);

			$.template_effect(() => {
				$.set_text(text, `${$.get(computed_const).width ?? ''} x ${$.get(computed_const).height ?? ''}`);

				$.set_text(text_1, `${(
					$.deep_read_state($.get(box2)),
					$.untrack(() => $.get(box2).width)
				) ?? ''} x ${(
					$.deep_read_state($.get(box2)),
					$.untrack(() => $.get(box2).height)
				) ?? ''}`);
			});

			$.append($$anchor, fragment_1);
		};

		var consequent_1 = ($$anchor) => {
			const box = $.derived_safe_equal(() => ($.deep_read_state(boxes()), $.untrack(() => boxes()[0])));

			const computed_const_1 = $.derived_safe_equal(() => {
				const { width, height } = $.get(box);

				return { width, height };
			});

			var div_2 = root_2();
			var text_2 = $.child(div_2);

			$.reset(div_2);
			$.template_effect(() => $.set_text(text_2, `${$.get(computed_const_1).width ?? ''} x ${$.get(computed_const_1).height ?? ''}`));
			$.append($$anchor, div_2);
		};

		$.if(node, ($$render) => {
			if ((
				$.deep_read_state(boxes()),
				$.untrack(() => boxes().length > 1)
			)) $$render(consequent); else if ((
				$.deep_read_state(boxes()),
				$.untrack(() => boxes().length > 0)
			)) $$render(consequent_1, 1);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_2 = ($$anchor) => {
			var fragment_2 = root_3();
			var div_3 = $.first_child(fragment_2);
			var text_3 = $.child(div_3);

			$.reset(div_3);

			var div_4 = $.sibling(div_3, 2);
			var text_4 = $.child(div_4);

			$.reset(div_4);

			$.template_effect(() => {
				$.set_text(text_3, `${(
					$.deep_read_state(boxes()),
					$.untrack(() => boxes()[0].width)
				) ?? ''} x ${(
					$.deep_read_state(boxes()),
					$.untrack(() => boxes()[0].height)
				) ?? ''}`);

				$.set_text(text_4, `${(
					$.deep_read_state(boxes()),
					$.untrack(() => boxes()[1].width)
				) ?? ''} x ${(
					$.deep_read_state(boxes()),
					$.untrack(() => boxes()[1].height)
				) ?? ''}`);
			});

			$.append($$anchor, fragment_2);
		};

		var consequent_3 = ($$anchor) => {
			const box = $.derived_safe_equal(() => ($.deep_read_state(boxes()), $.untrack(() => boxes()[0])));

			const computed_const_2 = $.derived_safe_equal(() => {
				const { width, height } = $.get(box);

				return { width, height };
			});

			var div_5 = root_4();
			var text_5 = $.child(div_5);

			$.reset(div_5);
			$.template_effect(() => $.set_text(text_5, `${$.get(computed_const_2).width ?? ''} x ${$.get(computed_const_2).height ?? ''}`));
			$.append($$anchor, div_5);
		};

		$.if(node_1, ($$render) => {
			if ((
				$.deep_read_state(boxes()),
				$.untrack(() => boxes().length > 1)
			)) $$render(consequent_2); else if ((
				$.deep_read_state(boxes()),
				$.untrack(() => boxes().length > 0)
			)) $$render(consequent_3, 1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}