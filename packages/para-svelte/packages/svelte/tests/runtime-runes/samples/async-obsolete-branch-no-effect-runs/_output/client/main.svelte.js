import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from "./Child.svelte";

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p>true</p> <!>`, 1);
var root_4 = $.from_html(`<p>false</p> <!>`, 1);
var root = $.from_html(`<button>increment</button> <button>resolve</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let deferreds = [];

	function push(v) {
		return new Promise((resolve, reject) => {
			deferreds.push({ resolve: () => resolve(v), reject });
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

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
					const double = $.derived(() => $.get(count) * 2);
					var fragment_2 = root_3();
					var text = $.sibling($.first_child(fragment_2));
					var node_2 = $.sibling(text);

					$.async(node_2, void 0, [() => push($.get(count))], ($$anchor, $0) => {
						Child(node_2, {
							get count() {
								return $.get($0);
							}
						});
					});

					$.template_effect(($0) => $.set_text(text, ` ${$0 ?? ''} ${$.get(double) ?? ''} `), void 0, [() => push($.get(count))]);
					$.append($$anchor, fragment_2);
				};

				var alternate = ($$anchor) => {
					var fragment_3 = root_4();
					var node_3 = $.sibling($.first_child(fragment_3), 2);

					$.async(node_3, void 0, [() => push($.get(count))], ($$anchor, $0) => {
						Child(node_3, {
							get count() {
								return $.get($0);
							}
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
	$.delegated('click', button_1, () => deferreds.shift()?.resolve());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);