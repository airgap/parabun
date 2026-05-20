import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	const foo = [{ in: 'bar' }];
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => foo, $.index, ($$anchor, $$item) => {
		let bar = () => $.get($$item).in;
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, bar()));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);
}