import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let items = $.state(null);
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(($0) => $.set_text(text, `items: ${$0 ?? ''}`), [() => JSON.stringify($.get(items))]);
	$.delegated('click', button, () => $.set(items, $.get(items) ?? [], true).push($.get(items).length));
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);