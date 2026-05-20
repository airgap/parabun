import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<option> </option>`);
var root_3 = $.from_html(`<option>-1</option>`);
var root = $.from_html(`<select><!></select>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise = getNumbers();
	let selected = $.mutable_source(2);

	async function getNumbers() {
		await new Promise((resolve) => setTimeout(resolve, 100));

		return [1, 2, 3];
	}

	$.init();

	var select = root();
	var node = $.child(select);

	$.await(
		node,
		() => promise,
		($$anchor) => {
			var option_1 = root_3();

			$.append($$anchor, option_1);
		},
		($$anchor, numbers) => {
			var fragment = $.comment();
			var node_1 = $.first_child(fragment);

			$.each(node_1, 1, () => $.get(numbers), $.index, ($$anchor, number) => {
				var option = root_2();
				var text = $.child(option, true);

				$.reset(option);

				var option_value = {};

				$.template_effect(() => {
					$.set_text(text, $.get(number));

					if (option_value !== (option_value = $.get(number))) {
						option.__value = $.get(number);
					}
				});

				$.append($$anchor, option);
			});

			$.append($$anchor, fragment);
		}
	);

	$.reset(select);
	$.bind_select_value(select, () => $.get(selected), ($$value) => $.set(selected, $$value));
	$.append($$anchor, select);
	$.pop();
}