import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let array = $.mutable_source();

	$.legacy_pre_effect(() => {}, () => {
		$.set(array, []);
		$.mutate(array, $.get(array)[0] = [false, false]);
		$.mutate(array, $.get(array)[1] = [false, false]);
	});

	$.legacy_pre_effect_reset();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(array), $.index, ($$anchor, row, i) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.each(node_1, 1, () => $.get(row), $.index, ($$anchor, item, j) => {
			var button = root_2();
			var text = $.child(button, true);

			$.reset(button);
			$.template_effect(() => $.set_text(text, $.get(item)));
			$.event('click', button, () => $.mutate(array, $.get(array)[i][j] = !$.get(array)[i][j]));
			$.append($$anchor, button);
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
	$.pop();
}