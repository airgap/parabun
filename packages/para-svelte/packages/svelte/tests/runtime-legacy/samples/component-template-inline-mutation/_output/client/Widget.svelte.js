import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Widget($$anchor) {
	let count = $.mutable_source(0);
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(count)));
	$.event('click', button, () => $.set(count, $.get(count) + 1));
	$.append($$anchor, button);
}