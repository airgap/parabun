import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	console.log($$props.x);

	var $$promises = $.run([() => Promise.resolve(), () => void console.log($$props.x)]);

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $$props.x), void 0, void 0, [$$promises[1]]);
	$.append($$anchor, text);
}