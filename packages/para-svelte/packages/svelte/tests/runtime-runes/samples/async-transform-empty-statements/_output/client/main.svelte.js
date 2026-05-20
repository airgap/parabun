import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	var name;
	var $$promises = $.run([() => Promise.resolve(42), () => void 0]);

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $$props.name), void 0, void 0, [$$promises[1]]);
	$.append($$anchor, text);
}