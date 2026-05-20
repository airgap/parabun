import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<p> </p>`), Component[$.FILENAME], [[7, 0]]);

export default function Component($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component);
	$.inspect(() => [$$props.a], (...$$args) => ((t, c) => console.log(...$.log_if_contains_state('log', t, c)))(...$$args));

	var $$exports = { ...$.legacy_api() };
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $$props.a));
	$.append($$anchor, p);

	return $.pop($$exports);
}