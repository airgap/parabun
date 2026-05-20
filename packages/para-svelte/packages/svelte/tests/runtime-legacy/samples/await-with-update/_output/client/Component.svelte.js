import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var div = root();
	var text = $.child(div);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `count: ${count() ?? ''}`));
	$.append($$anchor, div);

	return $.pop($$exports);
}