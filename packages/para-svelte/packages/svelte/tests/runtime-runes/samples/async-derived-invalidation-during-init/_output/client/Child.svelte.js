import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	var d;

	var $$promises = $.run([
		async () => d = await $.async_derived(async () => ({ value: await $$props.promise }))
	]);

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, $0), void 0, [async () => (await $.get(d)).value], [$$promises[0]]);
	$.append($$anchor, p);
	$.pop();
}