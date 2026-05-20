import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Outer($$anchor, $$props) {
	$.push($$props, false);

	let prop = $.prop($$props, 'prop', 12);

	var $$exports = {
		get prop() {
			return prop();
		},

		set prop($$value) {
			prop($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(
		node,
		$$props,
		'main',
		{
			get value() {
				return prop();
			}
		},
		null
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}