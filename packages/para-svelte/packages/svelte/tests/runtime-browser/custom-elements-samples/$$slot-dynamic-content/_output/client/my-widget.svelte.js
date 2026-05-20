import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p>named fallback</p>`);
var root = $.from_html(`<!> <!>`, 1);

export default function _unknown_($$anchor, $$props) {
	var fragment = root();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var text = $.text('fallback');

		$.append($$anchor, text);
	});

	var node_1 = $.sibling(node, 2);

	$.slot(node_1, $$props, 'named', {}, ($$anchor) => {
		var p = root_2();

		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);
}

customElements.define('my-widget', $.create_custom_element(_unknown_, {}, ['default', 'named'], [], { mode: 'open' }));