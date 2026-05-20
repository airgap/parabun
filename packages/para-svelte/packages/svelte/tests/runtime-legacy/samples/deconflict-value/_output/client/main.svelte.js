import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<!> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const reactive = $.mutable_source();
	let value = $.mutable_source();

	$.legacy_pre_effect(() => ($.get(value)), () => {
		$.set(reactive, $.get(value));
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var node = $.first_child(fragment);

	Widget(node, {
		get value() {
			return $.get(value);
		},

		set value($$value) {
			$.set(value, $$value);
		},
		$$legacy: true
	});

	var p = $.sibling(node, 2);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, `Reactive: ${$.get(reactive) ?? ''}`);
		$.set_text(text_1, `Value: ${$.get(value) ?? ''}`);
	});

	$.append($$anchor, fragment);
	$.pop();
}