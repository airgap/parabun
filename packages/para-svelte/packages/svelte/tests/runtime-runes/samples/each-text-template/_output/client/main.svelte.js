import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(` <br/>`, 1);
var root = $.from_html(`<p></p>`);

export default function Main($$anchor) {
	let array = $.proxy(['A', 'B', 'C']);
	var p = root();

	$.each(p, 21, () => array, $.index, ($$anchor, a) => {
		$.next();

		var fragment = root_1();
		var text = $.first_child(fragment, true);

		$.next();
		$.template_effect(() => $.set_text(text, $.get(a)));
		$.append($$anchor, fragment);
	});

	$.reset(p);
	$.append($$anchor, p);
}