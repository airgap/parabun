import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p class="default">default fallback content</p>`);
var root_2 = $.from_html(`<p class="default">bar fallback content</p>`);
var root_3 = $.from_html(`<p class="default">foo fallback content</p>`);
var root = $.from_html(`<div><!> <!> <!></div>`);

export default function Nested($$anchor, $$props) {
	var div = root();
	var node = $.child(div);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var p = root_1();

		$.append($$anchor, p);
	});

	var node_1 = $.sibling(node, 2);

	$.slot(node_1, $$props, 'bar', {}, ($$anchor) => {
		var p_1 = root_2();

		$.append($$anchor, p_1);
	});

	var node_2 = $.sibling(node_1, 2);

	$.slot(node_2, $$props, 'foo', {}, ($$anchor) => {
		var p_2 = root_3();

		$.append($$anchor, p_2);
	});

	$.reset(div);
	$.append($$anchor, div);
}