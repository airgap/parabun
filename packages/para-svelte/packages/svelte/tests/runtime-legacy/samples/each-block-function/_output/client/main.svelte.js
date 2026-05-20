import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let numbers = $.prop($$props, 'numbers', 28, () => [1, 2, 3]);

	var $$exports = {
		get numbers() {
			return numbers();
		},

		set numbers($$value) {
			numbers($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, numbers, $.index, ($$anchor, i) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);

		$.template_effect(($0) => $.set_text(text, $0), [
			() => (
				$.deep_read_state(numbers()),
				$.get(i),
				$.untrack(() => numbers().map((j) => $.get(i) * j).join(', '))
			)
		]);

		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}