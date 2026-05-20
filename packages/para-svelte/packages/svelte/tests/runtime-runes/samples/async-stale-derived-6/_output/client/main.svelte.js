import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>a / c</button> <button>b / d</button> <button>pop 1</button> <button>shift 2</button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const queue1 = [];
	const queue2 = [];
	let a = $.state(0);
	let b = $.state(0);
	let c = $.state(0);
	let d = $.state(0);

	function push(value, where = 1) {
		if (!value) return value;

		return new Promise((r) => (where === 1 ? queue1 : queue2).push(() => r(value)));
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);
	var p = $.sibling(button_3, 2);
	var text = $.child(p);

	$.reset(p);

	$.template_effect(($0, $1, $2) => $.set_text(text, `${$.get(a) ?? ''} + ${$.get(b) ?? ''} = ${$0 ?? ''} | ${$1 ?? ''} ${$2 ?? ''}`), void 0, [
		() => push($.get(a) + $.get(b)),
		() => push($.get(c), 2),
		() => push($.get(d), 2)
	]);

	$.delegated('click', button, () => {
		$.update(a);
		$.update(c);
	});

	$.delegated('click', button_1, () => {
		$.set(b, $.get(b) + 2);
		$.update(d);
	});

	$.delegated('click', button_2, () => queue1.pop()?.());
	$.delegated('click', button_3, () => queue2.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);