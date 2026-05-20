import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

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

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		thePromise,
		($$anchor) => {
			var text_2 = $.text('Waiting...');

			$.append($$anchor, text_2);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { func } = $.get($$source);

				return { func };
			});

			var func = $.derived_safe_equal(() => $.get($$value).func);
			var text = $.text();

			$.template_effect(($0) => $.set_text(text, $0), [
				() => (
					$.deep_read_state($.get(func)),
					$.untrack(() => (() => $.get(func))())
				)
			]);

			$.append($$anchor, text);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { func: func_1 } = $.get($$source);

				return { func_1 };
			});

			var func_1 = $.derived_safe_equal(() => $.get($$value).func_1);
			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), [
				() => (
					$.deep_read_state($.get(func_1)),
					$.untrack(() => (() => $.get(func_1))())
				)
			]);

			$.append($$anchor, text_1);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}