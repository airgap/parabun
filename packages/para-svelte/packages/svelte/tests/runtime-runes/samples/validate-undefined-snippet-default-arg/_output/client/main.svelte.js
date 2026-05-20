import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

const test = ($$anchor, $$arg0) => {
	let param = $.derived_safe_equal(() => $.fallback($$arg0?.(), "default"));
	var p = root_1();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(param)));
	$.append($$anchor, p);
};

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	test($$anchor);
}