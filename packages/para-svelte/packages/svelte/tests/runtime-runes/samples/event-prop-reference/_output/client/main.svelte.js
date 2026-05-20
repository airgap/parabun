import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	function onclick() {
		console.log($$props.item?.name);
	}

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $$props.item?.name));
	$.delegated('click', button, onclick);
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);