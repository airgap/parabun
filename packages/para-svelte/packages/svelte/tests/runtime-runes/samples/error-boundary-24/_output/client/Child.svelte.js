import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>Child content</p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	throw new Error('child error');

	var p = root();

	$.append($$anchor, p);
	$.pop();
}