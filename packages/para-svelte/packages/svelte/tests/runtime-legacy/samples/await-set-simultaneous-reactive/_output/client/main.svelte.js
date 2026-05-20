import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p> <p> </p>`, 1);
var root_3 = $.from_html(`<p>well that's odd</p>`);
var root_4 = $.from_html(`<p>wait for it...</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const answer100 = $.mutable_source();
	let answer = $.mutable_source(0);

	let promise = $.prop($$props, 'promise', 28, () => new Promise((resolve) => {
		setTimeout(
			() => {
				resolve();
				$.set(answer, 42);
			},
			0
		);
	}));

	$.legacy_pre_effect(() => ($.get(answer)), () => {
		$.set(answer100, $.get(answer) * 100);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get promise() {
			return promise();
		},

		set promise($$value) {
			promise($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.await(
				node_1,
				promise,
				($$anchor) => {
					var p_3 = root_4();

					$.append($$anchor, p_3);
				},
				($$anchor, _) => {
					var fragment_2 = root_2();
					var p = $.first_child(fragment_2);
					var text = $.child(p);

					$.reset(p);

					var p_1 = $.sibling(p, 2);
					var text_1 = $.child(p_1);

					$.reset(p_1);

					$.template_effect(() => {
						$.set_text(text, `the answer is ${$.get(answer) ?? ''}!`);
						$.set_text(text_1, `the answer100 is ${$.get(answer100) ?? ''}!`);
					});

					$.append($$anchor, fragment_2);
				},
				($$anchor, error) => {
					var p_2 = root_3();

					$.append($$anchor, p_2);
				}
			);

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (promise()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}