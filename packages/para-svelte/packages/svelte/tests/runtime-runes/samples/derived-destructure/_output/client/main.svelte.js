import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button> </button> <button> </button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);
	let b = $.state(0);
	let c = $.state(0);

	const $$d = $.derived(() => ({ a: $.get(a), b: $.get(b), c: $.get(c) })),
		a1 = $.derived(() => $.get($$d).a),
		b1 = $.derived(() => $.get($$d).b),
		c1 = $.derived(() => $.get($$d).c);

	$.user_effect(() => {
		console.log('a', $.get(a1));
	});

	$.user_effect(() => {
		console.log('b', $.get(b1));
	});

	$.user_effect(() => {
		console.log('c', $.get(c1));
	});

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	var button_2 = $.sibling(button_1, 2);
	var text_2 = $.child(button_2, true);

	$.reset(button_2);

	$.template_effect(() => {
		$.set_text(text, $.get(a1));
		$.set_text(text_1, $.get(b1));
		$.set_text(text_2, $.get(c1));
	});

	$.delegated('click', button, () => $.update(a));
	$.delegated('click', button_1, () => $.update(b));
	$.delegated('click', button_2, () => $.update(c));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);