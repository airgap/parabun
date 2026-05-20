import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let numbers = $.prop($$props, 'numbers', 12);

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
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.deep_read_state(numbers()),
			$.untrack(() => numbers().filter((x) => x % 2).join(', '))
		)
	]);

	$.append($$anchor, text);

	return $.pop($$exports);
}