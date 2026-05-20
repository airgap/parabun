import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p>`, 1);
var root_2 = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p> <p> </p>`, 1);

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
			var text_9 = $.text('loading...');

			$.append($$anchor, text_9);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var [a, b, ...[,, c, ...{ length }]] = $.get($$source);

				return { a, b, c, length };
			});

			var a = $.derived_safe_equal(() => $.get($$value).a);
			var b = $.derived_safe_equal(() => $.get($$value).b);
			var c = $.derived_safe_equal(() => $.get($$value).c);
			var length = $.derived_safe_equal(() => $.get($$value).length);
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

			var p_3 = $.sibling(p_2, 2);
			var text_3 = $.child(p_3);

			$.reset(p_3);

			$.template_effect(() => {
				$.set_text(text, `a: ${$.get(a) ?? ''}`);
				$.set_text(text_1, `b: ${$.get(b) ?? ''}`);
				$.set_text(text_2, `c: ${$.get(c) ?? ''}`);
				$.set_text(text_3, `remaining length: ${$.get(length) ?? ''}`);
			});

			$.append($$anchor, fragment_1);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var [c, ...[d, e, f, ...[,, g]]] = $.get($$source);

				return { c, d, e, f, g };
			});

			var c = $.derived_safe_equal(() => $.get($$value).c);
			var d = $.derived_safe_equal(() => $.get($$value).d);
			var e = $.derived_safe_equal(() => $.get($$value).e);
			var f = $.derived_safe_equal(() => $.get($$value).f);
			var g = $.derived_safe_equal(() => $.get($$value).g);
			var fragment_2 = root_2();
			var p_4 = $.first_child(fragment_2);
			var text_4 = $.child(p_4);

			$.reset(p_4);

			var p_5 = $.sibling(p_4, 2);
			var text_5 = $.child(p_5);

			$.reset(p_5);

			var p_6 = $.sibling(p_5, 2);
			var text_6 = $.child(p_6);

			$.reset(p_6);

			var p_7 = $.sibling(p_6, 2);
			var text_7 = $.child(p_7);

			$.reset(p_7);

			var p_8 = $.sibling(p_7, 2);
			var text_8 = $.child(p_8);

			$.reset(p_8);

			$.template_effect(() => {
				$.set_text(text_4, `c: ${$.get(c) ?? ''}`);
				$.set_text(text_5, `d: ${$.get(d) ?? ''}`);
				$.set_text(text_6, `e: ${$.get(e) ?? ''}`);
				$.set_text(text_7, `f: ${$.get(f) ?? ''}`);
				$.set_text(text_8, `g: ${$.get(g) ?? ''}`);
			});

			$.append($$anchor, fragment_2);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}