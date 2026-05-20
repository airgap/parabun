import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Click me</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const square = $.mutable_source();
	let num = 2;

	function onClick() {
		this.innerHTML = $.get(square);
	}

	$.legacy_pre_effect(() => {}, () => {
		$.set(square, num * num);
	});

	$.legacy_pre_effect_reset();
	$.init();

	var button = root();

	$.event('click', button, onClick);
	$.append($$anchor, button);
	$.pop();
}