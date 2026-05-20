import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var select_content = $.from_html(`<!>`, 1);
var root = $.from_html(`<select><!></select>`);

export default function Select($$anchor, $$props) {
	let rest = $.rest_props($$props, ['$$slots', '$$events', '$$legacy', 'children']);
	var select = root();

	$.attribute_effect(select, () => ({ name: 'pets', id: 'pet-select1', ...rest }));

	$.customizable_select(select, () => {
		var anchor = $.child(select);
		var fragment = select_content();
		var node = $.first_child(fragment);

		$.snippet(node, () => $$props.children);
		$.append(anchor, fragment);
	});

	$.append($$anchor, select);
}