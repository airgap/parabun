import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span> </span>`);
var root_2 = $.from_html(`<span> </span>`);
var root = $.from_html(`<div id="first"></div> <div id="second"></div>`, 1);

export default function Main($$anchor) {
	let message = "the quick brown fox jumps over the lazy dog";
	var fragment = root();
	var div = $.first_child(fragment);

	$.each(div, 5, () => message, $.index, ($$anchor, char) => {
		var span = root_1();
		var text = $.child(span, true);

		$.reset(span);
		$.template_effect(() => $.set_text(text, $.get(char)));
		$.append($$anchor, span);
	});

	$.reset(div);

	var div_1 = $.sibling(div, 2);

	$.each(div_1, 5, () => message, $.index, ($$anchor, char) => {
		var span_1 = root_2();
		var text_1 = $.child(span_1, true);

		$.reset(span_1);
		$.template_effect(() => $.set_text(text_1, $.get(char)));
		$.append($$anchor, span_1);
	});

	$.reset(div_1);
	$.append($$anchor, fragment);
}