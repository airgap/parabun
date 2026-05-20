import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button id="one">one</button> <button id="two">two</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let active = $.mutable_source();

	$.legacy_pre_effect(() => ($.get(active)), () => {
		console.log($.get(active)?.id || $.get(active)?.nodeName || '...');
	});

	$.legacy_pre_effect_reset();

	var fragment = root();

	$.next(2);
	$.bind_active_element(($$value) => $.set(active, $$value));
	$.append($$anchor, fragment);
	$.pop();
}