import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-105rsgr"> </h1>`);

export default function Input($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 24, () => ({ bar: { baz: 5 } }));

	$.init();

	var h1 = root();
	var text = $.child(h1, true);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, ($.deep_read_state(foo()), $.untrack(() => foo().bar.baz))));
	$.append($$anchor, h1);
	$.pop();
}