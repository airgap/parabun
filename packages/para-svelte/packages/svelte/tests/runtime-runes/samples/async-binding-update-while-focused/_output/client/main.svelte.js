import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<p> </p> <input type="number"/>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let value = $.state(0);
	const min = 2;
	const max = 5;

	$.user_effect(() => {
		setValue();
	});

	function setValue() {
		if ($.get(value) < min) {
			$.set(value, min);
		}

		if ($.get(value) > max) {
			$.set(value, max);
		}
	}

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var p_1 = $.first_child(fragment_1);
			var text = $.child(p_1, true);

			$.reset(p_1);

			var input = $.sibling(p_1, 2);

			$.remove_input_defaults(input);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => $.get(value)]);
			$.bind_value(input, () => $.get(value), ($$value) => $.set(value, $$value));
			$.append($$anchor, fragment_1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}