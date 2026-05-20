import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span> </span>`);

export default function Main($$anchor) {
	let letters = ['a', 'b', 'c'];
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 17, () => letters, $.index, ($$anchor, letter, i) => {
		var span = root_1();
		var text = $.child(span);

		$.reset(span);
		$.template_effect(() => $.set_text(text, `${i}: ${$.get(letter) ?? ''}`));
		$.append($$anchor, span);
	});

	$.append($$anchor, fragment);
}