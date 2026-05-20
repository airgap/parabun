import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<u> </u>`);
var root_1 = $.from_html(`<b> </b> <!> <i> </i>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let numbers = $.prop($$props, 'numbers', 28, () => [
		{ a: 3, b: 4, children: [{ a: 5, b: 6 }, { a: 7, b: 8 }] },
		{ a: 9, b: 10, children: [{ a: 11, b: 12 }, { a: 13, b: 14 }] }
	]);

	var $$exports = {
		get numbers() {
			return numbers();
		},

		set numbers($$value) {
			numbers($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, numbers, $.index, ($$anchor, $$item) => {
		let a = () => $.get($$item).a;
		let b = () => $.get($$item).b;
		let children = () => $.get($$item).children;
		const ab = $.derived_safe_equal(() => a() + b());
		var fragment_1 = root_1();
		var b_1 = $.first_child(fragment_1);
		var text = $.child(b_1, true);

		$.reset(b_1);

		var node_1 = $.sibling(b_1, 2);

		$.each(node_1, 1, children, $.index, ($$anchor, $$item, $$index, $$array) => {
			let a = () => $.get($$item).a;
			let b = () => $.get($$item).b;
			const ab = $.derived_safe_equal(() => a() + b());
			var u = root_2();
			var text_1 = $.child(u, true);

			$.reset(u);
			$.template_effect(() => $.set_text(text_1, $.get(ab)));
			$.append($$anchor, u);
		});

		var i = $.sibling(node_1, 2);
		var text_2 = $.child(i, true);

		$.reset(i);

		$.template_effect(() => {
			$.set_text(text, $.get(ab));
			$.set_text(text_2, $.get(ab));
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}