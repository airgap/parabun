import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<!> <!> <!>`, 1);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let box = $.prop($$props, 'box', 12);

	var $$exports = {
		get box() {
			return box();
		},

		set box($$value) {
			box($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.slot(
		node,
		$$props,
		'box1',
		{
			get box() {
				return box();
			}
		},
		null
	);

	var node_1 = $.sibling(node, 2);

	$.slot(
		node_1,
		$$props,
		'box2',
		{
			get width() {
				return ($.deep_read_state(box()), $.untrack(() => box().width));
			},

			get height() {
				return ($.deep_read_state(box()), $.untrack(() => box().height));
			}
		},
		null
	);

	var node_2 = $.sibling(node_1, 2);

	$.slot(
		node_2,
		$$props,
		'default',
		{
			get box() {
				return box();
			}
		},
		null
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}