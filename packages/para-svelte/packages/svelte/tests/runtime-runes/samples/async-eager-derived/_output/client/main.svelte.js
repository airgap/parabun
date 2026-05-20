import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button>shift</button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);

	function push(value) {
		if (!value) return value;

		const { promise, resolve } = Promise.withResolvers();

		resolvers.push(() => resolve(value));

		return promise;
	}

	var delayedCount, derivedCount, resolvers;

	var $$promises = $.run([
		async () => delayedCount = await $.async_derived(() => push($.get(count))),
		() => {
			derivedCount = $.derived(() => $.get(count));
			resolvers = [];
		}
	]);

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var p = $.sibling(button_1, 2);
	var text_1 = $.child(p);

	$.reset(p);

	$.template_effect(
		($0, $1) => {
			$.set_text(text, `clicks: ${$.get(count) ?? ''} - ${$.get(delayedCount) ?? ''} - ${$.get(derivedCount) ?? ''}`);
			$.set_text(text_1, `${$0 ?? ''} - ${$1 ?? ''}`);
		},
		[
			() => $.eager(() => $.get(count)) !== $.get(count),
			() => $.eager(() => $.get(derivedCount)) !== $.get(derivedCount)
		],
		void 0,
		[$$promises[1], $$promises[0]]
	);

	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, () => resolvers.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);