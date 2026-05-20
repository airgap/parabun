import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor) {
	let foo = $.mutable_source();
	let bar = $.mutable_source($.set(foo, 1));

	function a() {
		$.set(bar, $.set(foo, 1));
	}

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `${$.get(foo) ?? ''} ${$.get(bar) ?? ''}`));
	$.append($$anchor, h1);
}