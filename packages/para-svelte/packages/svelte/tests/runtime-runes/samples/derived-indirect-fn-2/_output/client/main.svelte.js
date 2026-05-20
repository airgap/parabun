import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor) {
	let count = $.state(0);
	const doubled = () => $.get(count) * 2;
	const inc = () => $.update(count);
	let double = $.derived(doubled);
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(double)));
	$.event('click', button, inc);
	$.append($$anchor, button);
}