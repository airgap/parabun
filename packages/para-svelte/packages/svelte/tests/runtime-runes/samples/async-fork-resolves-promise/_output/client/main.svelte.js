import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { fork } from 'svelte';

var root = $.from_html(`<p> </p> <button>x</button> <button>y (fork)</button> <button>resolve</button> <button>commit</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let x = $.state(0);
	let y = $.state(0);
	let f;
	const deferred = [];

	function delay(value) {
		if (!value) return value;

		return new Promise((resolve) => deferred.push(() => resolve(value)));
	}

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var button = $.sibling(p, 2);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);

	$.template_effect(($0) => $.set_text(text, `${$.get(x) ?? ''} ${$0 ?? ''}`), void 0, [() => delay($.get(y))]);
	$.delegated('click', button, () => $.set(x, $.get(x) + 1));
	$.delegated('click', button_1, () => f = fork(() => $.set(y, $.get(y) + 1)));
	$.delegated('click', button_2, () => deferred.shift()?.());
	$.delegated('click', button_3, () => f.commit());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);