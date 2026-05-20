import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { getAbortSignal } from 'svelte';

var root = $.from_html(`<button> </button> <button>shift</button> <button>pop</button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const queue = [];

	function push(value) {
		if (value === 1) return 1;

		const d = Promise.withResolvers();

		queue.push(() => d.resolve(value));

		const signal = getAbortSignal();

		signal.onabort = () => d.reject(signal.reason);

		return d.promise;
	}

	function shift() {
		queue.shift()?.();
	}

	function pop() {
		queue.pop()?.();
	}

	let n = $.state(1);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var p = $.sibling(button_2, 2);
	var text_1 = $.child(p);

	$.reset(p);

	$.template_effect(
		($0, $1) => {
			$.set_text(text, $0);
			$.set_text(text_1, `${$.get(n) ?? ''} = ${$1 ?? ''}`);
		},
		[() => $.eager(() => $.get(n))],
		[() => push($.get(n))]
	);

	$.delegated('click', button, () => $.update(n));
	$.delegated('click', button_1, shift);
	$.delegated('click', button_2, pop);
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);