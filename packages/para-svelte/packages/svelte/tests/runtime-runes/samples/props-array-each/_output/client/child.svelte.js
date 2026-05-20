import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p> </p>`);
var root = $.from_html(`<!> <!> <!>`, 1);

export default function Child($$anchor, $$props) {
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 17, () => $$props.array, $.index, ($$anchor, number) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(number).v));
		$.append($$anchor, p);
	});

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 16, () => $$props.array, (number) => number, ($$anchor, number) => {
		var p_1 = root_2();
		var text_1 = $.child(p_1, true);

		$.reset(p_1);
		$.template_effect(() => $.set_text(text_1, number.v));
		$.append($$anchor, p_1);
	});

	var node_2 = $.sibling(node_1, 2);

	$.each(node_2, 17, () => $$props.array, (number) => number.v, ($$anchor, number) => {
		var p_2 = root_3();
		var text_2 = $.child(p_2, true);

		$.reset(p_2);
		$.template_effect(() => $.set_text(text_2, $.get(number).v));
		$.append($$anchor, p_2);
	});

	$.append($$anchor, fragment);
}