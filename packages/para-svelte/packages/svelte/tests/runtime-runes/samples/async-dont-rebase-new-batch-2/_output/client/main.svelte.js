import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { untrack } from "svelte";

var root = $.from_html(`<button>increment</button> <button>resolve</button> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);
	let b = $.state(0);
	let c = $.state(0);
	const queued = [];

	function delay(v) {
		console.log('delay ' + v);

		if (!v) return v;

		return new Promise((resolve) => {
			queued.push(() => resolve(v));
		});
	}

	$.user_effect(() => {
		if ($.get(b) + $.get(c) === 0 || $.get(b) + $.get(c) > 2) return;

		console.log('effect run');

		untrack(() => {
			$.update(b);
			$.update(c);
		});
	});

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var text = $.sibling(button_1);

	$.template_effect(($0) => $.set_text(text, ` ${$0 ?? ''}`), void 0, [() => delay($.get(a) + $.get(b) + $.get(c))]);

	$.delegated('click', button, () => {
		$.update(a);
		$.update(b);
	});

	$.delegated('click', button_1, () => queued.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);