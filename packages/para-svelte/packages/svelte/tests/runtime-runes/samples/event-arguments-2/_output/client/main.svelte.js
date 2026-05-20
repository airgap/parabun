import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor) {
	let count = $.state(0);

	function increment(...args) {
		$.set(count, $.get(count) + args.length);
	}

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(count)));
	$.event('click', button, increment);
	$.append($$anchor, button);
}