import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(` <button>a++</button> <button>c++</button> <button>shift</button> <button>pop</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);

	function delay(value) {
		if (!value) return value;

		return new Promise((resolve) => deferred.push(() => resolve(value)));
	}

	var b, c, d, deferred;

	var $$promises = $.run([
		async () => b = await $.async_derived(() => delay($.get(a) * 2)),
		() => c = $.state(0),
		async () => d = await $.async_derived(() => delay($.get(b) + $.get(c))),
		() => deferred = []
	]);

	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var button = $.sibling(text);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);

	$.template_effect(() => $.set_text(text, `a ${$.get(a) ?? ''} | b ${$.get(b) ?? ''} | c ${$.get(c) ?? ''} | d ${$.get(d) ?? ''} `), void 0, void 0, [$$promises[2]]);

	$.delegated('click', button, () => {
		$.update(a);
	});

	$.delegated('click', button_1, () => {
		$.update(c);
	});

	$.delegated('click', button_2, () => deferred.shift()?.());
	$.delegated('click', button_3, () => deferred.pop()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);