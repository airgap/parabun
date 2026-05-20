import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<select><option>one</option><option>two</option><option>three</option></select> <p> </p>`, 1);
var root = $.from_html(`<button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let selected = $.state('two');
	let resolvers = [];
	let select;

	function push(value) {
		const { promise, resolve } = Promise.withResolvers();

		resolvers.push(() => resolve(value));

		return promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var select_1 = $.first_child(fragment_1);

			$.bind_this(select_1, ($$value) => select = $$value, () => select);

			var p_1 = $.sibling(select_1, 2);
			var text = $.child(p_1, true);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => push($.get(selected))]);
			$.bind_select_value(select_1, () => $.get(selected), ($$value) => $.set(selected, $$value));
			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => {
		select?.focus();
		resolvers.shift()?.();
	});

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);