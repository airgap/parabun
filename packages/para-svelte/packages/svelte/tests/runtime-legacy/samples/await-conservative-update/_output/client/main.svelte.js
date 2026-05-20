import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { sleep } from './sleep.js';

var root_1 = $.from_html(`<p> </p> <p> </p>`, 1);
var root_2 = $.from_html(`<p>loading...</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.mutable_source(0);

	const get_promise = () => {
		return sleep(10).then(() => {
			$.set(count, $.get(count) + 1);

			return 42;
		});
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		() => ($.untrack(get_promise)),
		($$anchor) => {
			var p_2 = root_2();

			$.append($$anchor, p_2);
		},
		($$anchor, value) => {
			var fragment_1 = root_1();
			var p = $.first_child(fragment_1);
			var text = $.child(p);

			$.reset(p);

			var p_1 = $.sibling(p, 2);
			var text_1 = $.child(p_1);

			$.reset(p_1);

			$.template_effect(() => {
				$.set_text(text, `the answer is ${$.get(value) ?? ''}`);
				$.set_text(text_1, `count: ${$.get(count) ?? ''}`);
			});

			$.append($$anchor, fragment_1);
		}
	);

	$.append($$anchor, fragment);
	$.pop();
}