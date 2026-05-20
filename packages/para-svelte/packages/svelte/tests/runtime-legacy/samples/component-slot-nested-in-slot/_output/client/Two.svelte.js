import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Two($$anchor, $$props) {
	$.push($$props, false);

	let b = $.prop($$props, 'b', 12);

	var $$exports = {
		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(
		node,
		$$props,
		'two',
		{
			get two() {
				return b();
			}
		},
		null
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}