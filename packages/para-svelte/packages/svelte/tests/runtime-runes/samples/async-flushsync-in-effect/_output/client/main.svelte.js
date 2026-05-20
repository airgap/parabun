import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { flushSync } from 'svelte';

var root = $.from_html(`<button> </button> <button>shift</button> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	const queue = [];

	$.user_effect(() => {
		if ($.get(count) === 1) {
			$.set(count, 2);
			flushSync();
		}
	});

	function push(v) {
		if (v === 0) return v;

		return new Promise((r) => queue.push(() => r(v)));
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.sibling(button_1);

	$.template_effect(
		($0) => {
			$.set_text(text, `clicks: ${$.get(count) ?? ''}`);
			$.set_text(text_1, ` ${$0 ?? ''}`);
		},
		void 0,
		[() => push($.get(count))]
	);

	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, () => queue.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);