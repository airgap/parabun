import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p> <p> </p>`, 1);
var root_2 = $.from_html(`<p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let thePromise = $.prop($$props, 'thePromise', 12);

	var $$exports = {
		get thePromise() {
			return thePromise();
		},

		set thePromise($$value) {
			thePromise($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		thePromise,
		($$anchor) => {
			var text_5 = $.text('loading...');

			$.append($$anchor, text_5);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var [a, b] = $.get($$source);

				return { a, b };
			});

			var a = $.derived_safe_equal(() => $.get($$value).a);
			var b = $.derived_safe_equal(() => $.get($$value).b);
			var fragment_1 = root_1();
			var p = $.first_child(fragment_1);
			var text = $.child(p);

			$.reset(p);

			var p_1 = $.sibling(p, 2);
			var text_1 = $.child(p_1);

			$.reset(p_1);

			$.template_effect(() => {
				$.set_text(text, `a: ${$.get(a) ?? ''}`);
				$.set_text(text_1, `b: ${$.get(b) ?? ''}`);
			});

			$.append($$anchor, fragment_1);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var [c, [d, e]] = $.get($$source);

				return { c, d, e };
			});

			var c = $.derived_safe_equal(() => $.get($$value).c);
			var d = $.derived_safe_equal(() => $.get($$value).d);
			var e = $.derived_safe_equal(() => $.get($$value).e);
			var fragment_2 = root_2();
			var p_2 = $.first_child(fragment_2);
			var text_2 = $.child(p_2);

			$.reset(p_2);

			var p_3 = $.sibling(p_2, 2);
			var text_3 = $.child(p_3);

			$.reset(p_3);

			var p_4 = $.sibling(p_3, 2);
			var text_4 = $.child(p_4);

			$.reset(p_4);

			$.template_effect(() => {
				$.set_text(text_2, `c: ${$.get(c) ?? ''}`);
				$.set_text(text_3, `d: ${$.get(d) ?? ''}`);
				$.set_text(text_4, `e: ${$.get(e) ?? ''}`);
			});

			$.append($$anchor, fragment_2);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}