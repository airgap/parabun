import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Component[$.FILENAME], [[9, 0]]);

export default function Component($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component);

	let is_open = $.prop($$props, 'open', 15);

	function open() {
		is_open(!is_open());
	}

	var $$exports = {
		...$.legacy_api(),
		get open() {
			return open;
		}
	};

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, is_open()));
	$.delegated('click', button, open);
	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);