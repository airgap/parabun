import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Update</button> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor) {
	let a = $.state(0);
	let b = $.state("b");
	let c = $.state(true);
	let d = $.state($.proxy([]));
	let e = $.state($.proxy({ x: 10, y: 12 }));
	let f = $.proxy({ w: 15, v: 16 });

	function change() {
		(($$value) => {
			var $$array_1 = $.to_array($$value.g, 2);

			$.set(d, $$value.d, true);
			$.set(e, $$value.e, true);
			f.w = $$array_1[0];
			f.v = $$array_1[1];
		})({
			d: (($$value) => {
				var $$array = $.to_array($$value, 3);

				$.set(a, $$array[0], true);
				$.set(b, $$array[1], true);
				$.set(c, $$array[2], true);

				return $$value;
			})([5, "d", false]),
			e: { x: 100, y: 120 },
			g: [25, 26]
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2, true);

	$.reset(p_2);

	var p_3 = $.sibling(p_2, 2);
	var text_3 = $.child(p_3, true);

	$.reset(p_3);

	var p_4 = $.sibling(p_3, 2);
	var text_4 = $.child(p_4, true);

	$.reset(p_4);

	var p_5 = $.sibling(p_4, 2);
	var text_5 = $.child(p_5, true);

	$.reset(p_5);

	var p_6 = $.sibling(p_5, 2);
	var text_6 = $.child(p_6, true);

	$.reset(p_6);

	var p_7 = $.sibling(p_6, 2);
	var text_7 = $.child(p_7, true);

	$.reset(p_7);

	$.template_effect(() => {
		$.set_text(text, $.get(a));
		$.set_text(text_1, $.get(b));
		$.set_text(text_2, $.get(c));
		$.set_text(text_3, $.get(d).length);
		$.set_text(text_4, $.get(e).x);
		$.set_text(text_5, $.get(e).y);
		$.set_text(text_6, f.w);
		$.set_text(text_7, f.v);
	});

	$.event('click', button, change);
	$.append($$anchor, fragment);
}