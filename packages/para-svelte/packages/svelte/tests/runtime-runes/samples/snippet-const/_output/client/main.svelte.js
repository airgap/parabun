import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);

export default function Main($$anchor) {
	const counter = ($$anchor) => {
		const doubled = $.derived(() => $.get(count) * 2);
		var button = root_1();
		var text = $.child(button, true);

		$.reset(button);
		$.template_effect(() => $.set_text(text, $.get(doubled)));
		$.event('click', button, () => $.set(count, $.get(count) + 1));
		$.append($$anchor, button);
	};

	let count = $.state(0);

	counter($$anchor);
}