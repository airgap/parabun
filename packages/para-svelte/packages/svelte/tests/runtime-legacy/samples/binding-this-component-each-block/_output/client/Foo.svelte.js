import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>foo</div>`);

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	const test = true;
	var $$exports = { test };
	var div = root();

	$.append($$anchor, div);
	$.bind_prop($$props, 'test', test);

	return $.pop($$exports);
}