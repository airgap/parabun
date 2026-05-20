import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/> <input/> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let people = $.prop($$props, 'people', 12);

	var $$exports = {
		get people() {
			return people();
		},

		set people($$value) {
			people($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, people, $.index, ($$anchor, $$item) => {
		let f = () => $.get($$item).name.first;
		let l = () => $.get($$item).name.last;
		var fragment_1 = root_1();
		var input = $.first_child(fragment_1);

		$.remove_input_defaults(input);

		var input_1 = $.sibling(input, 2);

		$.remove_input_defaults(input_1);

		var p = $.sibling(input_1, 2);
		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `${f() ?? ''} ${l() ?? ''}`));

		$.bind_value(input, f, ($$value) => (
			$.get($$item).name.first = $$value,
			$.invalidate_inner_signals(() => (people()))
		));

		$.bind_value(input_1, l, ($$value) => (
			$.get($$item).name.last = $$value,
			$.invalidate_inner_signals(() => (people()))
		));

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}