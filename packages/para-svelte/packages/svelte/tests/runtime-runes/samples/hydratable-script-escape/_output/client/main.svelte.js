import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { hydratable } from "svelte";

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	var value;

	var $$promises = $.run([
		async () => value = await hydratable($$props.key, () => Promise.resolve('safe'))
	]);

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, value), void 0, void 0, [$$promises[0]]);
	$.append($$anchor, p);
	$.pop();
}