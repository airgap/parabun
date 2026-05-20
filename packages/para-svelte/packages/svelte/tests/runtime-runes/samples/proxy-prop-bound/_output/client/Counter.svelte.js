import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Counter($$anchor, $$props) {
	$.push($$props, true);

	/** @type {{ object: { count: number }}} */
	let object = $.prop($$props, 'object', 15);

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${object().count ?? ''}`));
	$.delegated('click', button, () => object(object().count += 1, true));
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);