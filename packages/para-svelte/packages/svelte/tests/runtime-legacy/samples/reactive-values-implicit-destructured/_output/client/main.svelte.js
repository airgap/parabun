import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const x = $.mutable_source();
	const y = $.mutable_source();
	const answer = $.mutable_source();
	let coords = $.prop($$props, 'coords', 12);
	let numbers = $.prop($$props, 'numbers', 12);

	$.legacy_pre_effect(() => ($.get(x), $.get(y), $.deep_read_state(coords())), () => {
		(($$value) => {
			var $$array = $.to_array($$value, 2);

			$.set(x, $$array[0]);
			$.set(y, $$array[1]);
		})(coords());
	});

	$.legacy_pre_effect(() => ($.get(answer), $.deep_read_state(numbers())), () => {
		(($$value) => {
			$.set(answer, $$value.answer);
		})(numbers());
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get coords() {
			return coords();
		},

		set coords($$value) {
			coords($$value);
			$.flush();
		},

		get numbers() {
			return numbers();
		},

		set numbers($$value) {
			numbers($$value);
			$.flush();
		}
	};

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, `${$.get(x) ?? ''},${$.get(y) ?? ''}`);
		$.set_text(text_1, $.get(answer));
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}