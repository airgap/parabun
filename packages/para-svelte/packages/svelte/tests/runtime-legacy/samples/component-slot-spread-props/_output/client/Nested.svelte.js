import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!> <div></div></div>`);

export default function Nested($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	var div = root();
	var node = $.child(div);

	$.slot(node, $$props, 'default', {}, null);

	var div_1 = $.sibling(node, 2);

	$.attribute_effect(div_1, () => ({ ...$$sanitized_props }));
	$.reset(div);
	$.append($$anchor, div);
}