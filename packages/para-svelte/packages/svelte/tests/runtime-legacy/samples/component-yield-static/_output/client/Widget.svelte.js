import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<b><!></b>`);

export default function Widget($$anchor, $$props) {
	var b = root();
	var node = $.child(b);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(b);
	$.append($$anchor, b);
}