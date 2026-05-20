import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>change</button>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	let value = $.prop($$props, 'value', 15);
	var button = root();

	$.delegated('click', button, () => value('a'));
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);