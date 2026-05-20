import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p> <p> </p> <p> </p>`, 1);
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
			var text_6 = $.text('loading...');

			$.append($$anchor, text_6);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { 1: a, 3: b, 4: c } = $.get($$source);

				return { a, b, c };
			});

			var a = $.derived_safe_equal(() => $.get($$value).a);
			var b = $.derived_safe_equal(() => $.get($$value).b);
			var c = $.derived_safe_equal(() => $.get($$value).c);
			var fragment_1 = root_1();
			var p = $.first_child(fragment_1);
			var text = $.child(p);

			$.reset(p);

			var p_1 = $.sibling(p, 2);
			var text_1 = $.child(p_1);

			$.reset(p_1);

			var p_2 = $.sibling(p_1, 2);
			var text_2 = $.child(p_2);

			$.reset(p_2);

			$.template_effect(() => {
				$.set_text(text, `[1] ${$.get(a) ?? ''}`);
				$.set_text(text_1, `[3] ${$.get(b) ?? ''}`);
				$.set_text(text_2, `[4] ${$.get(c) ?? ''}`);
			});

			$.append($$anchor, fragment_1);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { 0: d, 2: e, 5: f } = $.get($$source);

				return { d, e, f };
			});

			var d = $.derived_safe_equal(() => $.get($$value).d);
			var e = $.derived_safe_equal(() => $.get($$value).e);
			var f = $.derived_safe_equal(() => $.get($$value).f);
			var fragment_2 = root_2();
			var p_3 = $.first_child(fragment_2);
			var text_3 = $.child(p_3);

			$.reset(p_3);

			var p_4 = $.sibling(p_3, 2);
			var text_4 = $.child(p_4);

			$.reset(p_4);

			var p_5 = $.sibling(p_4, 2);
			var text_5 = $.child(p_5);

			$.reset(p_5);

			$.template_effect(() => {
				$.set_text(text_3, `[0] ${$.get(d) ?? ''}`);
				$.set_text(text_4, `[2] ${$.get(e) ?? ''}`);
				$.set_text(text_5, `[5] ${$.get(f) ?? ''}`);
			});

			$.append($$anchor, fragment_2);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}