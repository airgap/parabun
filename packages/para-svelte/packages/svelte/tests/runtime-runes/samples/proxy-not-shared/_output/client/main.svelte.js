import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button> </button>`, 1);

export default function Main($$anchor) {
	let obj = { count: 0 };
	let a = $.proxy(obj);
	let b = $.proxy(obj);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	$.template_effect(() => {
		$.set_text(text, a.count);
		$.set_text(text_1, b.count);
	});

	$.delegated('click', button, () => a.count += 1);
	$.delegated('click', button_1, () => b.count += 1);
	$.append($$anchor, fragment);
}

$.delegate(['click']);