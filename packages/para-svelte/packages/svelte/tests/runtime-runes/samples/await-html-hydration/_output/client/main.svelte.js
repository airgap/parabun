import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor) {
	var div = root();
	var node = $.child(div);

	$.async(node, [], [() => Promise.resolve(`<span>Foo</span>`)], (node, $$html) => {
		$.html(node, () => $.get($$html));
	});

	$.reset(div);
	$.append($$anchor, div);
}