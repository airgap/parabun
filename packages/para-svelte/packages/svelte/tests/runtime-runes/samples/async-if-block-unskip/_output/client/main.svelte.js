import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(` <!> <!> <button>load</button> <button>resolve</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let query = $.state('');

	// changing the query results in a new promise with loading initialized to true
	const promise = $.derived(() => push($.get(query)));

	const resolvers = [];

	function push(value) {
		if (!value) return Promise.resolve(value);

		const { promise, resolve } = Promise.withResolvers();

		resolvers.push(() => {
			// before resolving, set loading to false - this makes it run in a different batch
			$.set(loading, false);

			resolve(value);
		});

		let loading = $.state(true);

		Object.defineProperty(promise, 'loading', {
			get() {
				return $.get(loading);
			}
		});

		return promise;
	}

	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var node = $.sibling(text);

	{
		var consequent = ($$anchor) => {
			var text_1 = $.text();

			$.template_effect(() => $.set_text(text_1, $.get(query)));
			$.append($$anchor, text_1);
		};

		$.if(node, ($$render) => {
			if (!$.get(promise).loading) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			var text_2 = $.text();

			$.template_effect(($0) => $.set_text(text_2, $0), void 0, [() => $.get(query)]);
			$.append($$anchor, text_2);
		};

		$.if(node_1, ($$render) => {
			if (!$.get(promise).loading) $$render(consequent_1);
		});
	}

	var button = $.sibling(node_1, 2);
	var button_1 = $.sibling(button, 2);

	$.template_effect(($0) => $.set_text(text, `${$.get(query) ?? ''} ${$0 ?? ''} `), void 0, [() => $.get(promise)]);
	$.delegated('click', button, () => $.set(query, 'search'));
	$.delegated('click', button_1, () => resolvers.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);