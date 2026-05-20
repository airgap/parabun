import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let array = $.prop($$props, 'array', 12);

	var $$exports = {
		get array() {
			return array();
		},

		set array($$value) {
			array($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, array, $.index, ($$anchor, $$item) => {
		var $$array = $.derived(() => $.to_array($.get($$item)));
		var $$array_1 = $.derived(() => $.to_array($.get($$array).slice(2)));
		let first = () => $.get($$array)[0];
		let second = () => $.get($$array)[1];
		let third = () => $.get($$array_1)[0];
		let length = () => $.get($$array_1).slice(1).length;
		var p = root_1();
		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `First: ${first() ?? ''}, Second: ${second() ?? ''}, Third: ${third() ?? ''}, Elements remaining: ${length() ?? ''}`));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}