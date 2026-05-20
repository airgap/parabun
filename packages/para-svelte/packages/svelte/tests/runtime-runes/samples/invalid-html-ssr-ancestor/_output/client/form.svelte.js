import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Form[$.FILENAME] = 'form.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<form></form>`), Form[$.FILENAME], [[1, 0]]);

export default function Form($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Form);

	var $$exports = { ...$.legacy_api() };
	var form = root();

	$.append($$anchor, form);

	return $.pop($$exports);
}