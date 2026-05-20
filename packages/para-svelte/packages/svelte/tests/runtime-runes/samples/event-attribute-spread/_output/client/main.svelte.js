import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button>change handler</button>`, 1);

export default function Main($$anchor) {
	let count = $.state(0);
	let obj = $.state($.proxy({ onclick: () => $.update(count) }));
	var fragment = root();
	var button = $.first_child(fragment);

	$.attribute_effect(button, () => ({ ...$.get(obj) }));

	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);

	$.template_effect(() => $.set_text(text, $.get(count)));
	$.delegated('click', button_1, () => $.set(obj, { onclick: () => $.update(count, -1) }, true));
	$.append($$anchor, fragment);
}

$.delegate(['click']);