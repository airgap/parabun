import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let raw = $.prop($$props, 'raw', 12);

	var $$exports = {
		get raw() {
			return raw();
		},

		set raw($$value) {
			raw($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.html(node, raw);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}