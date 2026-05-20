import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);
	let called = $.mutable_source(false);

	onMount(() => {
		$.set(called, true);
	});

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, value());
		$.set_text(text_1, $.get(called));
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}