import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p> <p> </p>`, 1);
var root_2 = $.from_html(`<p> </p> <p> </p>`, 1);

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
			var text_4 = $.text('loading...');

			$.append($$anchor, text_4);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { result, error } = $.get($$source);

				return { result, error };
			});

			var result = $.derived_safe_equal(() => $.get($$value).result);
			var error = $.derived_safe_equal(() => $.get($$value).error);
			var fragment_1 = root_1();
			var p = $.first_child(fragment_1);
			var text = $.child(p);

			$.reset(p);

			var p_1 = $.sibling(p, 2);
			var text_1 = $.child(p_1);

			$.reset(p_1);

			$.template_effect(() => {
				$.set_text(text, `error: ${$.get(error) ?? ''}`);
				$.set_text(text_1, `result: ${$.get(result) ?? ''}`);
			});

			$.append($$anchor, fragment_1);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { error: { message, code } } = $.get($$source);

				return { message, code };
			});

			var message = $.derived_safe_equal(() => $.get($$value).message);
			var code = $.derived_safe_equal(() => $.get($$value).code);
			var fragment_2 = root_2();
			var p_2 = $.first_child(fragment_2);
			var text_2 = $.child(p_2);

			$.reset(p_2);

			var p_3 = $.sibling(p_2, 2);
			var text_3 = $.child(p_3);

			$.reset(p_3);

			$.template_effect(() => {
				$.set_text(text_2, `message: ${$.get(message) ?? ''}`);
				$.set_text(text_3, `code: ${$.get(code) ?? ''}`);
			});

			$.append($$anchor, fragment_2);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}