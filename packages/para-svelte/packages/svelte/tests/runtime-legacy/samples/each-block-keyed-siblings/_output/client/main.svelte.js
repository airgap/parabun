import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);
var root_2 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let ones = $.prop($$props, 'ones', 12);
	let twos = $.prop($$props, 'twos', 12);

	var $$exports = {
		get ones() {
			return ones();
		},

		set ones($$value) {
			ones($$value);
			$.flush();
		},

		get twos() {
			return twos();
		},

		set twos($$value) {
			twos($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, ones, (one) => one.text, ($$anchor, one) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, ($.get(one), $.untrack(() => $.get(one).text))));
		$.append($$anchor, div);
	});

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 1, twos, (two) => two.text, ($$anchor, two) => {
		var div_1 = root_2();
		var text_1 = $.child(div_1, true);

		$.reset(div_1);
		$.template_effect(() => $.set_text(text_1, ($.get(two), $.untrack(() => $.get(two).text))));
		$.append($$anchor, div_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}