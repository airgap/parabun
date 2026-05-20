import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Widget[$.FILENAME] = 'Widget.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div> </div>`), Widget[$.FILENAME], [[5, 0]]);

export default function Widget($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Widget);

	let value = $.prop($$props, 'value', 12);

	var $$exports = {
		...$.legacy_api(),
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	var div = root();
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, value()));
	$.append($$anchor, div);

	return $.pop($$exports);
}