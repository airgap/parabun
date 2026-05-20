import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p> <p> </p>`, 1);
var root_3 = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let thePromise = $.prop($$props, 'thePromise', 12);
	let count = $.mutable_source(0);

	setTimeout(
		() => {
			$.update(count);
		},
		0
	);

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

	$.await(node, thePromise, null, ($$anchor, $$source) => {
		var $$value = $.derived_safe_equal(() => {
			var { result } = $.get($$source);

			return { result };
		});

		var result = $.derived_safe_equal(() => $.get($$value).result);
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				var fragment_2 = root_2();
				var p = $.first_child(fragment_2);
				var text = $.child(p);

				$.reset(p);

				var p_1 = $.sibling(p, 2);
				var text_1 = $.child(p_1);

				$.reset(p_1);

				$.template_effect(() => {
					$.set_text(text, `result: ${$.get(result) ?? ''}`);
					$.set_text(text_1, `count: ${$.get(count) ?? ''}`);
				});

				$.append($$anchor, fragment_2);
			};

			var alternate = ($$anchor) => {
				var fragment_3 = root_3();
				var p_2 = $.first_child(fragment_3);
				var text_2 = $.child(p_2);

				$.reset(p_2);

				var p_3 = $.sibling(p_2, 2);
				var text_3 = $.child(p_3);

				$.reset(p_3);

				$.template_effect(() => {
					$.set_text(text_2, `result: ${$.get(result) ?? ''}`);
					$.set_text(text_3, `count: ${$.get(count) ?? ''}`);
				});

				$.append($$anchor, fragment_3);
			};

			$.if(node_1, ($$render) => {
				if ($.get(result)) $$render(consequent); else $$render(alternate, -1);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}