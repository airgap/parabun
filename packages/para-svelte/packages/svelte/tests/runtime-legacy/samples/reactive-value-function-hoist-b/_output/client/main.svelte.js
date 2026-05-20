import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Click me</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const uppercase = $.mutable_source();
	let array = ['a', 'b', 'c'];

	function onClick() {
		this.innerHTML = $.get(uppercase).join(',');
	}

	$.legacy_pre_effect(() => {}, () => {
		$.set(uppercase, array.map((str) => str.toUpperCase()));
	});

	$.legacy_pre_effect_reset();
	$.init();

	var button = root();

	$.event('click', button, onClick);
	$.append($$anchor, button);
	$.pop();
}