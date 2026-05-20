import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let clicked = $.state(false);

	function increment() {
		$.set(clicked, true);
		$.update(count);
	}

	$.user_effect(() => {
		if ($.get(clicked)) {
			$.update(count);
		}
	});

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(count)));
	$.delegated('click', button, increment);
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);