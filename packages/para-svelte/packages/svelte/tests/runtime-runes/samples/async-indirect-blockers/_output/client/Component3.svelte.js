import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <p> </p>`, 1);

export default function Component3($$anchor) {
	// Test indirect blocker dependencies
	function x() {
		return $.get(value);
	}

	function getValue() {
		return x();
	}

	function setValue(v) {
		$.set(value, v, true);
	}

	var value;
	var $$promises = $.run([() => 1, () => value = $.state('')]);
	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var p = $.sibling(input, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, $0), [() => getValue()], void 0, [$$promises[1]]);

	$.run_after_blockers([$$promises[1], $$promises[1]], () => {
		$.bind_value(input, getValue, setValue);
	});

	$.append($$anchor, fragment);
}