import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.from_html(`<!> <button> </button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	const double = $.derived(() => $.get(count) * 2);
	var fragment = root();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {};

		$.boundary(node, { pending }, ($$anchor) => {
			$.next();

			var text = $.text();

			$.template_effect(($0) => $.set_text(text, $0), void 0, [
				() => new Promise((r) => {
					// long enough for the test to do all its other stuff while this is pending
					setTimeout(r, 10);
				})
			]);

			$.append($$anchor, text);
		});
	}

	var button = $.sibling(node, 2);
	var text_1 = $.child(button, true);

	$.reset(button);

	var node_1 = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			Component($$anchor, {
				get double() {
					return $.get(double);
				}
			});
		};

		$.if(node_1, ($$render) => {
			if ($.get(count) > 0) $$render(consequent);
		});
	}

	$.template_effect(() => $.set_text(text_1, $.get(count)));
	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);