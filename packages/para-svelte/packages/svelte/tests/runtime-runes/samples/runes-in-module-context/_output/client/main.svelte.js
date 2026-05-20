import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

function createCounter() {
	let count = $.state(0);
	let double = $.derived(() => $.get(count) * 2);

	return {
		get count() {
			return $.get(count);
		},

		set count(value) {
			$.set(count, value, true);
		},

		get double() {
			return $.get(double);
		}
	};
}

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor) {
	const counter = createCounter();
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, counter.double));
	$.event('click', button, () => counter.count++);
	$.append($$anchor, button);
}