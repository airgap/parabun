import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>+1</button>`);

export default function Counter($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12, 0);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var button = root();

	$.event('click', button, () => count(count() + 1));
	$.append($$anchor, button);

	return $.pop($$exports);
}