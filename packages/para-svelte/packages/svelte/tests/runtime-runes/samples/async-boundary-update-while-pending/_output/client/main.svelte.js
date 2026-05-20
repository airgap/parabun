import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>shift</button> <button>increment</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let queue = [];

	function push(value) {
		const deferred = Promise.withResolvers();

		queue.push(() => deferred.resolve(value));

		return deferred.promise;
	}

	let count = $.state(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = ($$anchor) => {
			$.next();

			var text = $.text('loading');

			$.append($$anchor, text);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			$.next();

			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push($.get(count))]);
			$.append($$anchor, text_1);
		});
	}

	$.delegated('click', button, () => queue.shift()());
	$.delegated('click', button_1, () => $.update(count));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);