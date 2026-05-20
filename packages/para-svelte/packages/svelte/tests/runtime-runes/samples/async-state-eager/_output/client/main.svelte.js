import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button> </button> <button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let resolvers = [];

	function push(value) {
		const { promise, resolve } = Promise.withResolvers();

		resolvers.push(() => resolve(value));

		return promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = ($$anchor) => {};

		$.boundary(node, { pending }, ($$anchor) => {
			var p = root_1();
			var text_1 = $.child(p, true);

			$.reset(p);
			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push($.get(count))]);
			$.append($$anchor, p);
		});
	}

	$.template_effect(($0) => $.set_text(text, $0), [() => $.eager(() => $.get(count))]);
	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, () => resolvers.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);