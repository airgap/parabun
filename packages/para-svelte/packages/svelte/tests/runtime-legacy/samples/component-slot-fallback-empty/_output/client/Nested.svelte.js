import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p class="default">default fallback content</p>`);
var root = $.from_html(`<div><!> <!></div>`);

export default function Nested($$anchor, $$props) {
	var div = root();
	var node = $.child(div);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var p = root_1();

		$.append($$anchor, p);
	});

	var node_1 = $.sibling(node, 2);

	$.slot(node_1, $$props, 'bar', {}, ($$anchor) => {
		var text = $.text('bar fallback');

		$.append($$anchor, text);
	});

	$.reset(div);
	$.append($$anchor, div);
}