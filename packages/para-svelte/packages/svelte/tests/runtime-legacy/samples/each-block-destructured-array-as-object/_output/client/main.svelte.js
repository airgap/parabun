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
		let first = () => $.get($$item)[0];
		let third = () => $.get($$item)['2'];
		let length = () => $.get($$item)["length"];
		var p = root_1();
		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `First: ${first() ?? ''}, Third: ${third() ?? ''}, Length: ${length() ?? ''}`));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}