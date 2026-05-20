import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><span>something</span></div>`);

export default function Main($$anchor) {
	let test = 42;
	var div = root();

	$.template_effect(() => {
		console.log({ test: $.untrack(() => $.snapshot(test)) });

		debugger;
	});

	$.append($$anchor, div);
}