import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Echo($$anchor, $$props) {
	$.push($$props, false);

	let dummy = $.prop($$props, 'dummy', 12);

	var $$exports = {
		get dummy() {
			return dummy();
		},

		set dummy($$value) {
			dummy($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(
		node,
		$$props,
		'default',
		{
			get dummy() {
				return dummy();
			}
		},
		null
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}