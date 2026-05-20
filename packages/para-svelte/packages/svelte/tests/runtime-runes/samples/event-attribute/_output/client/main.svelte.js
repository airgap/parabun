import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button> </button>`, 1);

export default function Main($$anchor) {
	let count = $.state(0);
	const onclick = () => $.update(count);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	$.template_effect(() => {
		$.set_text(text, $.get(count));
		$.set_text(text_1, $.get(count));
	});

	$.delegated('click', button, () => $.update(count));
	$.delegated('click', button_1, onclick);
	$.append($$anchor, fragment);
}

$.delegate(['click']);