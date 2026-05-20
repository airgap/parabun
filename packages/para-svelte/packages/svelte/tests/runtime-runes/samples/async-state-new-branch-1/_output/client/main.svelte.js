import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(` <!>`, 1);
var root = $.from_html(`<button>x</button> <button>y++</button> <button>resolve</button> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let x = $.state('world');
	let y = $.state(0);
	let deferred = [];

	function delay(s) {
		const d = Promise.withResolvers();

		deferred.push(() => d.resolve(s));

		return d.promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

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

	var node_2 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			Child($$anchor, {
				get x() {
					return $.get(x);
				}
			});
		};

		$.if(node_2, ($$render) => {
			if ($.get(y) > 0) $$render(consequent_1);
		});
	}

	$.delegated('click', button, () => $.set(x, 'universe'));
	$.delegated('click', button_1, () => $.update(y));
	$.delegated('click', button_2, () => deferred.shift()());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);