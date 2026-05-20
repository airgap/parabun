import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Item($$anchor, $$props) {
	$.push($$props, true);

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(($0) => $.set_text(text, `${$$props.item.name ?? ''} ${$0 ?? ''}`), [() => $$props.items.includes($$props.item)]);

	$.delegated('click', button, function (...$$args) {
		$$props.onclick?.apply(this, $$args);
	});

	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);