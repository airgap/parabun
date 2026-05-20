import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const resolvers = [];

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
			Child($$anchor, {
				push,
				children: ($$anchor, $$slotProps) => {
					var p_1 = root_3();
					var text = $.child(p_1, true);

					$.reset(p_1);
					$.template_effect(($0) => $.set_text(text, $0), void 0, [() => push('hello from parent')]);
					$.append($$anchor, p_1);
				},
				$$slots: { default: true }
			});
		});
	}

	$.delegated('click', button, () => resolvers.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);