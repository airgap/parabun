import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>a</div>`);

export default function ComponentA($$anchor, $$props) {
	$.push($$props, true);

	const a = {};
	var $$exports = { a };
	var div = root();

	$.append($$anchor, div);

	return $.pop($$exports);
}