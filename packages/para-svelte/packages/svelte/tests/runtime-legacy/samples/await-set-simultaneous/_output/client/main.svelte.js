import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>well that's odd</p>`);
var root_4 = $.from_html(`<p>wait for it...</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise = $.prop($$props, 'promise', 12);
	let answer = $.prop($$props, 'answer', 12);

	var $$exports = {
		get promise() {
			return promise();
		},

		set promise($$value) {
			promise($$value);
			$.flush();
		},

		get answer() {
			return answer();
		},

		set answer($$value) {
			answer($$value);
			$.flush();
		}
	};

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
					var p_2 = root_4();

					$.append($$anchor, p_2);
				},
				($$anchor, _) => {
					var p = root_2();
					var text = $.child(p);

					$.reset(p);
					$.template_effect(() => $.set_text(text, `the answer is ${answer() ?? ''}!`));
					$.append($$anchor, p);
				},
				($$anchor, error) => {
					var p_1 = root_3();

					$.append($$anchor, p_1);
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