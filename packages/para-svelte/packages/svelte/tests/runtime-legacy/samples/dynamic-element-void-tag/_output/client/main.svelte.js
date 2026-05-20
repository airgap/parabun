import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1></h1> <!> <!> <!> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let propTag = $.prop($$props, 'propTag', 12);
	const static_tag = 'input';
	const func_tag = () => 'br';

	var $$exports = {
		get propTag() {
			return propTag();
		},

		set propTag($$value) {
			propTag($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.element(node, () => 'foo', false);

	var node_1 = $.sibling(node, 2);

	$.element(node_1, () => "img", false);

	var node_2 = $.sibling(node_1, 2);

	$.element(node_2, propTag, false);

	var node_3 = $.sibling(node_2, 2);

	$.element(node_3, () => static_tag, false);

	var node_4 = $.sibling(node_3, 2);

	$.element(node_4, func_tag, false);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}