import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	async function x() {
		let d = (await $.save($.async_derived(() => new Promise((f) => {}))))();
	}

	let indirect = $.derived(() => x() && $$props.count);
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(indirect)));
	$.append($$anchor, p);
	$.pop();
}