import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>foo</button> <p> </p>`, 1);

export default function Main($$anchor) {
	let x = $.mutable_source(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `x: ${$.get(x) ?? ''}`));
	$.event('click', button, () => $.update(x));
	$.append($$anchor, fragment);
}