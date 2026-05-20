import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { untrack } from 'svelte';

var root = $.from_html(`<button> </button> <button> </button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let multiplier = $.state(1);
	let result = $.derived(() => $.get(count) * untrack(() => $.get(multiplier)));
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1);

	$.reset(button_1);

	$.template_effect(() => {
		$.set_text(text, `multiplier: ${$.get(multiplier) ?? ''}`);
		$.set_text(text_1, `result: ${$.get(result) ?? ''}`);
	});

	$.event('click', button, () => $.update(multiplier));
	$.event('click', button_1, () => $.update(count));
	$.append($$anchor, fragment);
	$.pop();
}