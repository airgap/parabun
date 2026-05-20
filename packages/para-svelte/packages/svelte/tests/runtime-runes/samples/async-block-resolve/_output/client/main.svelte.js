import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p>even</p>`);
var root_4 = $.from_html(`<p>odd</p>`);
var root_6 = $.from_html(`<p>loading...</p>`);
var root_7 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<!> <!>`, 1);
var root = $.from_html(`<button> </button> <button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let resolvers = [];

	function push(value) {
		const { promise, resolve } = Promise.withResolvers();

		resolvers.push(() => resolve(value));

		return promise;
	}

	let count = $.state(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [], [async () => (await $.save(push($.get(count))))() % 2 === 0], (node_1, $$condition) => {
				var consequent = ($$anchor) => {
					var p_1 = root_3();

					$.append($$anchor, p_1);
				};

				var alternate = ($$anchor) => {
					var p_2 = root_4();

					$.append($$anchor, p_2);
				};

				$.if(node_1, ($$render) => {
					if ($.get($$condition)) $$render(consequent); else $$render(alternate, -1);
				});
			});

			var node_2 = $.sibling(node_1, 2);

			$.key(node_2, () => $.get(count), ($$anchor) => {
				var fragment_2 = $.comment();
				var node_3 = $.first_child(fragment_2);

				{
					const pending = ($$anchor) => {
						var p_3 = root_6();

						$.append($$anchor, p_3);
					};

					$.boundary(node_3, { pending }, ($$anchor) => {
						var p_4 = root_7();
						var text_1 = $.child(p_4, true);

						$.reset(p_4);
						$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push($.get(count))]);
						$.append($$anchor, p_4);
					});
				}

				$.append($$anchor, fragment_2);
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.template_effect(($0) => $.set_text(text, $0), [() => $.eager(() => $.get(count))]);
	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, () => resolvers.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);