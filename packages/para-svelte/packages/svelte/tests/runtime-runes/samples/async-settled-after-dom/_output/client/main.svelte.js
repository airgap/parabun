import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>shift</button> <button>update</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let text = $.state('hello');
	const resolvers = [];

	function push(value) {
		const { promise, resolve } = Promise.withResolvers();

		resolvers.push(() => resolve(value));

		return promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = ($$anchor) => {};

		$.boundary(node, { pending }, ($$anchor) => {
			var p = root_1();
			var text_1 = $.child(p, true);

			$.reset(p);
			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push($.get(text))]);
			$.append($$anchor, p);
		});
	}

	$.delegated('click', button, () => resolvers.shift()?.());
	$.delegated('click', button_1, () => $.set(text, 'goodbye'));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);