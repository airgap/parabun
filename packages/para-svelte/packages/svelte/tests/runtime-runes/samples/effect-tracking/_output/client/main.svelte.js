import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { untrack } from 'svelte';

var root = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const foo = $.effect_tracking();
	let bar = $.state(false);

	$.user_pre_effect(() => {
		$.set(bar, $.effect_tracking(), true);
	});

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2, true);

	$.reset(p_2);

	var p_3 = $.sibling(p_2, 2);
	var text_3 = $.child(p_3, true);

	$.reset(p_3);

	$.template_effect(
		($0, $1) => {
			$.set_text(text, foo);
			$.set_text(text_1, $.get(bar));
			$.set_text(text_2, $0);
			$.set_text(text_3, $1);
		},
		[
			() => ($.get(bar), $.effect_tracking()),
			() => untrack(() => ($.get(bar), $.effect_tracking()))
		]
	);

	$.append($$anchor, fragment);
	$.pop();
}