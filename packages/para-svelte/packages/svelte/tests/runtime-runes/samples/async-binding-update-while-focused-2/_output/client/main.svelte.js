import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<input type="number"/> <p> </p>`, 1);
var root = $.from_html(`<button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let resolvers = [];
	let input;

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
			var input_1 = $.first_child(fragment_1);

			$.remove_input_defaults(input_1);
			$.bind_this(input_1, ($$value) => input = $$value, () => input);

			var p_1 = $.sibling(input_1, 2);
			var text = $.child(p_1, true);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => push($.get(count))]);
			$.bind_value(input_1, () => $.get(count), ($$value) => $.set(count, $$value));
			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => {
		input?.focus();
		resolvers.shift()?.();
	});

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);