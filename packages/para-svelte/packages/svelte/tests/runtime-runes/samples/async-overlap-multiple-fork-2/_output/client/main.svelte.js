import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { fork } from 'svelte';

var root = $.from_html(`<p> </p> <button>a and b (fork)</button> <button>a and c</button> <button>b and d</button> <button>shift</button> <button>pop</button> <button>commit fork</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);
	let b = $.state(0);
	let c = $.state(0);
	let d = $.state(0);
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
	var button_4 = $.sibling(button_3, 2);
	var button_5 = $.sibling(button_4, 2);

	$.template_effect(($0, $1) => $.set_text(text, `a ${$0 ?? ''} | b ${$1 ?? ''} | c ${$.get(c) ?? ''} | d ${$.get(d) ?? ''}`), void 0, [() => delay($.get(a)), () => delay($.get(b))]);

	$.delegated('click', button, () => {
		f = fork(() => {
			$.update(a);
			$.update(b);
		});
	});

	$.delegated('click', button_1, () => {
		$.update(a);
		$.update(c);
	});

	$.delegated('click', button_2, () => {
		$.update(b);
		$.update(d);
	});

	$.delegated('click', button_3, () => deferred.shift()?.());
	$.delegated('click', button_4, () => deferred.pop()?.());
	$.delegated('click', button_5, () => f.commit());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);