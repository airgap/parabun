import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function RawMustache($$anchor, $$props) {
	$.push($$props, false);

	let content = $.prop($$props, 'content', 12);

	var $$exports = {
		get content() {
			return content();
		},

		set content($$value) {
			content($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.html(node, content);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}