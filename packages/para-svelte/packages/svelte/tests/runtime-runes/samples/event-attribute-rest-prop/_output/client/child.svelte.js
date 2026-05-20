import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	let rest = $.rest_props($$props, ['$$slots', '$$events', '$$legacy', 'label']);
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $$props.label));
	$.delegated('click', button, () => $$props?.onclick());
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);