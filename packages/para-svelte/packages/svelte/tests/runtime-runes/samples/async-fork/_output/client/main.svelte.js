import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { fork } from 'svelte';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p>even</p>`);
var root_4 = $.from_html(`<p>odd</p>`);
var root = $.from_html(`<button>shift</button> <button>increment</button> <button>commit</button> <p> </p> <p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	const resolvers = [];
	let f = null;

	function push(value) {
		const { promise, resolve } = Promise.withResolvers();

		resolvers.push(() => resolve(value));

		return promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var p = $.sibling(button_2, 2);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	var node = $.sibling(p_1, 2);

	{
		const pending = ($$anchor) => {
			var p_2 = root_1();

			$.append($$anchor, p_2);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [], [async () => (await $.save(push($.get(count))))() % 2 === 0], (node_1, $$condition) => {
				var consequent = ($$anchor) => {
					var p_3 = root_3();

					$.append($$anchor, p_3);
				};

				var alternate = ($$anchor) => {
					var p_4 = root_4();

					$.append($$anchor, p_4);
				};

				$.if(node_1, ($$render) => {
					if ($.get($$condition)) $$render(consequent); else $$render(alternate, -1);
				});
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.template_effect(
		($0) => {
			$.set_text(text, `count: ${$.get(count) ?? ''}`);
			$.set_text(text_1, `eager: ${$0 ?? ''}`);
		},
		[() => $.eager(() => $.get(count))]
	);

	$.delegated('click', button, () => resolvers.shift()?.());

	$.delegated('click', button_1, async () => {
		f = await fork(() => {
			$.set(count, $.get(count) + 1);
		});
	});

	$.delegated('click', button_2, () => f?.commit());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);