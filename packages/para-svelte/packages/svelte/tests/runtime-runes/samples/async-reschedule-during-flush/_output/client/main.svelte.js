import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(` <!>`, 1);
var root = $.from_html(`<button> </button> <button> </button> <button>resolve</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(false);
	let b = $.state(false);
	let deferred = [];

	function push(value) {
		const d = Promise.withResolvers();

		deferred.push(() => d.resolve(value));

		return d.promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1);

	$.reset(button_1);

	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var text_2 = $.first_child(fragment_1);
			var node_1 = $.sibling(text_2);

			Child(node_1, {});
			$.template_effect(($0) => $.set_text(text_2, `${$0 ?? ''} `), void 0, [() => push(42)]);
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if ($.get(a)) $$render(consequent);
		});
	}

	$.template_effect(() => {
		$.set_text(text, `a (${$.get(a) ?? ''})`);
		$.set_text(text_1, `b (${$.get(b) ?? ''})`);
	});

	$.delegated('click', button, () => $.set(a, !$.get(a)));
	$.delegated('click', button_1, () => $.set(b, !$.get(b)));
	$.delegated('click', button_2, () => deferred.shift()());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);