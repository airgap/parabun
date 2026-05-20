import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_4 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>true</p> <!>`, 1);
var root_6 = $.from_html(`<p> </p>`);
var root_5 = $.from_html(`<p>false</p> <!>`, 1);
var root = $.from_html(`<button>increment</button> <button>resolve</button> <button>reject</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let deferreds = [];

	function push() {
		const deferred = Promise.withResolvers();

		deferreds.push(deferred);

		return deferred.promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var fragment_2 = root_3();
					var node_2 = $.sibling($.first_child(fragment_2), 2);

					$.async(node_2, [], [push], (node_2, $$collection) => {
						$.each(node_2, 17, () => $.get($$collection), $.index, ($$anchor, count, $$index, $$array) => {
							var p_1 = root_4();
							var text = $.child(p_1, true);

							$.reset(p_1);
							$.template_effect(() => $.set_text(text, $.get(count)));
							$.append($$anchor, p_1);
						});
					});

					$.append($$anchor, fragment_2);
				};

				var alternate = ($$anchor) => {
					var fragment_3 = root_5();
					var node_3 = $.sibling($.first_child(fragment_3), 2);

					$.async(node_3, [], [push], (node_3, $$collection) => {
						$.each(node_3, 17, () => $.get($$collection), $.index, ($$anchor, count, $$index_1, $$array_1) => {
							var p_2 = root_6();
							var text_1 = $.child(p_2, true);

							$.reset(p_2);
							$.template_effect(() => $.set_text(text_1, $.get(count)));
							$.append($$anchor, p_2);
						});
					});

					$.append($$anchor, fragment_3);
				};

				$.if(node_1, ($$render) => {
					if ($.get(count) % 2 === 0) $$render(consequent); else $$render(alternate, -1);
				});
			}

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, () => deferreds.shift()?.resolve([$.get(count)]));
	$.delegated('click', button_2, () => deferreds.shift()?.reject(new Error('oops')));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);