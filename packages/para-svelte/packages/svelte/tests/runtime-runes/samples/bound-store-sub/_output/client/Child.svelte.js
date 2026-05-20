import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<p><input type="number"/></p>`), Child[$.FILENAME], [[5, 0, [[6, 1]]]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let form = $.prop($$props, 'form', 15);
	var $$exports = { ...$.legacy_api() };
	var p = root();
	var input = $.child(p);

	$.remove_input_defaults(input);
	$.validate_binding('bind:value={form.count}', [], form, () => 'count', 6, 22);
	$.reset(p);

	$.bind_value(
		input,
		function get() {
			return form().count;
		},
		function set($$value) {
			$$ownership_validator.mutation('form', ['form', 'count'], form(form().count = $$value, true), 6, 34);
		}
	);

	$.append($$anchor, p);

	return $.pop($$exports);
}