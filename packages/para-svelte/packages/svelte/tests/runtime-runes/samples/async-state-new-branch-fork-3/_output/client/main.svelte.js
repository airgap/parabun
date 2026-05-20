import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { fork } from 'svelte';
import Child from './Child.svelte';

var root_1 = $.from_html(` <!>`, 1);
var root = $.from_html(`<button>x</button> <button>y++</button> <button>shift</button> <button>pop</button> <button>commit</button> <!> <hr/> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let x = $.state('world');
	let y = $.state(0);
	let f;
	const deferred = [];

	function delay(value) {
		if (value !== 'universe') return value;

		return new Promise((resolve) => deferred.push(() => resolve(value)));
	}

	function delay2(value) {
		return new Promise((resolve) => deferred.push(() => resolve(value)));
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);
	var button_4 = $.sibling(button_3, 2);
	var node = $.sibling(button_4, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var text = $.first_child(fragment_1);
			var node_1 = $.sibling(text);

			Child(node_1, {
				get x() {
					return $.get(x);
				}
			});

			$.template_effect(($0) => $.set_text(text, `${$0 ?? ''} `), void 0, [() => delay($.get(x))]);
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if ($.get(x) === 'universe') $$render(consequent);
		});
	}

	var node_2 = $.sibling(node, 4);

	{
		var consequent_1 = ($$anchor) => {
			{
				$.async($$anchor, void 0, [() => delay2($.get(x))], ($$anchor, $0) => {
					Child($$anchor, {
						get x() {
							return $.get($0);
						}
					});
				});

				$.next();
			}
		};

		$.if(node_2, ($$render) => {
			if ($.get(y) > 0) $$render(consequent_1);
		});
	}

	$.delegated('click', button, () => f = fork(() => {
		$.set(x, 'universe');
	}));

	$.delegated('click', button_1, () => $.update(y));
	$.delegated('click', button_2, () => deferred.shift()?.());
	$.delegated('click', button_3, () => deferred.pop()?.());
	$.delegated('click', button_4, () => f.commit());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);