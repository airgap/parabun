import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>increment</button> <button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let resolvers = [];

	function push(value) {
		const deferred = Promise.withResolvers();

		resolvers.push(() => deferred.resolve(value));

		return deferred.promise;
	}

	function shift() {
		resolvers.shift()?.();
	}

	let count = $.state(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(count)));
			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var p_1 = root_2();
			var text_1 = $.child(p_1, true);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push('resolved')]);
			$.append($$anchor, p_1);
		});
	}

	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, shift);
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);