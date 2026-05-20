import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>increment</button> <button>pop</button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let other = $.state(0);
	const queue = [];

	function push(v) {
		if (v === 0) return v;

		return new Promise((fulfil) => {
			queue.push(() => fulfil(v));
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var p = $.sibling(button_1, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, `${$0 ?? ''} ${$.get(count) ?? ''} ${$.get(other) ?? ''}`), void 0, [() => push($.get(count))]);

	$.delegated('click', button, () => {
		if ($.get(count) === 0) $.update(other);

		$.update(count);
	});

	$.delegated('click', button_1, () => queue.pop()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);