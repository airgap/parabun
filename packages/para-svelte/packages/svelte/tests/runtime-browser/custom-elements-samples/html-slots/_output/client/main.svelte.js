import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>default fallback content</p>`);
var root_2 = $.from_html(`<p>foo fallback content</p>`);
var root = $.from_html(`<div><!> <!></div>`);

export default function _unknown_($$anchor, $$props) {
	var div = root();
	var node = $.child(div);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var p = root_1();

		$.append($$anchor, p);
	});

	var node_1 = $.sibling(node, 2);

	$.slot(node_1, $$props, 'foo', {}, ($$anchor) => {
		var p_1 = root_2();

		$.append($$anchor, p_1);
	});

	$.reset(div);
	$.append($$anchor, div);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, {}, ['default', 'foo'], [], { mode: 'open' }));