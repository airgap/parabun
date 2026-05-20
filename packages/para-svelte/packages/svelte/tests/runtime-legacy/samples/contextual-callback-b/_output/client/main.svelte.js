import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select><option>please choose</option><!></select>`);

export default function Main($$anchor) {
	let available = [1, 2, 3, 4, 5];
	let taken = [2, 4];
	var select = root();
	var option = $.child(select);

	option.value = option.__value = 'please choose';

	var node = $.sibling(option);

	$.each(node, 1, () => available, $.index, ($$anchor, a) => {
		var option_1 = root_1();
		var text = $.child(option_1, true);

		$.reset(option_1);

		var option_1_value = {};

		$.template_effect(
			($0) => {
				option_1.disabled = $0;
				$.set_text(text, $.get(a));

				if (option_1_value !== (option_1_value = $.get(a))) {
					option_1.value = (option_1.__value = $.get(a)) ?? '';
				}
			},
			[
				() => (
					$.get(a),
					$.untrack(() => !!taken.find((f) => f == $.get(a)))
				)
			]
		);

		$.append($$anchor, option_1);
	});

	$.reset(select);
	$.append($$anchor, select);
}