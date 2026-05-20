import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p> </p>`);
var root = $.from_html(`<!> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let numbers = $.prop($$props, 'numbers', 28, () => new Set([1, 2]));

	var $$exports = {
		get numbers() {
			return numbers();
		},

		set numbers($$value) {
			numbers($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, numbers, $.index, ($$anchor, i) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(i)));
		$.append($$anchor, p);
	});

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 1, numbers, $.index, ($$anchor, i, index) => {
		var p_1 = root_2();
		var text_1 = $.child(p_1);

		$.reset(p_1);
		$.template_effect(() => $.set_text(text_1, `${$.get(i) ?? ''} ${index}`));
		$.append($$anchor, p_1);
	});

	var node_2 = $.sibling(node_1, 2);

	$.each(node_2, 3, numbers, (i) => i, ($$anchor, i, index) => {
		var p_2 = root_3();
		var text_2 = $.child(p_2);

		$.reset(p_2);
		$.template_effect(() => $.set_text(text_2, `${$.get(i) ?? ''} ${$.get(index) ?? ''}`));
		$.append($$anchor, p_2);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}