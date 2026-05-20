import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<option> </option>`);
var root_2 = $.from_html(`<select></select> <p> </p>`, 1);
var root = $.from_html(`<button>add</button> <button>shift</button> <button>reset</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let selected = $.state('a');
	let items = $.proxy(['a', 'b']);
	let resolvers = [];
	let select;

	function push(value) {
		const { promise, resolve } = Promise.withResolvers();

		resolvers.push(() => resolve(value));

		return promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var select_1 = $.first_child(fragment_1);

			$.each(select_1, 21, () => items, $.index, ($$anchor, item) => {
				var option = root_3();
				var text = $.child(option, true);

				$.reset(option);

				var option_value = {};

				$.template_effect(() => {
					$.set_text(text, $.get(item));

					if (option_value !== (option_value = $.get(item))) {
						option.value = (option.__value = $.get(item)) ?? '';
					}
				});

				$.append($$anchor, option);
			});

			$.reset(select_1);
			$.bind_this(select_1, ($$value) => select = $$value, () => select);

			var p_1 = $.sibling(select_1, 2);
			var text_1 = $.child(p_1, true);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push($.get(selected))]);
			$.bind_select_value(select_1, () => $.get(selected), ($$value) => $.set(selected, $$value));
			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => items.push(String.fromCharCode(97 + items.length)));
	$.delegated('click', button_1, () => resolvers.shift()?.());
	$.delegated('click', button_2, () => $.set(selected, 'a'));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);