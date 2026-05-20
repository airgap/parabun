import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	let tmp = $$props.data, foo = $.proxy(tmp.foo);

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, foo));
	$.append($$anchor, text);
}