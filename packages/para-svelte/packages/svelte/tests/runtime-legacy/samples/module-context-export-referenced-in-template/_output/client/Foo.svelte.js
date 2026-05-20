import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export function foo() {
	return 42;
}

var root = $.from_html(`<button>foo</button>`);

export default function Foo($$anchor) {
	var button = root();

	$.event('click', button, foo);
	$.append($$anchor, button);
}