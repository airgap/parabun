import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor) {
	let foo1 = $.mutable_source();
	let foo2 = $.mutable_source();

	for (let bar = $.set(foo1, 0); bar < 5; bar += 1) {
		$.set(foo2, $.get(foo1));
	}

	function a() {
		for (let bar = $.set(foo1, 0); bar < 5; bar += 1) {
			$.set(foo2, $.get(foo1));
		}
	}

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `${$.get(foo1) ?? ''} ${$.get(foo2) ?? ''}`));
	$.append($$anchor, h1);
}