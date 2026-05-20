import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Input($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 8);

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, ($.deep_read_state(foo()), $.untrack(() => foo().bar.baz))));
	$.append($$anchor, text);
	$.pop();
}