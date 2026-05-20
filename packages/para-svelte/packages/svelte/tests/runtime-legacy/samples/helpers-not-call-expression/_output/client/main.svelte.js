import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let numbers = $.prop($$props, 'numbers', 28, () => [1, 2, 3]);
	const square = (num) => num * num;

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

	var p = root();
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.deep_read_state(numbers()),
			$.untrack(() => numbers().map(square))
		)
	]);

	$.append($$anchor, p);

	return $.pop($$exports);
}