import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let condition = $.state(false);

	$.user_effect(() => {
		if ($.get(condition)) {
			try {
				setContext('potato', {});
				console.log('works without experimental async but really shouldnt');
			} catch(e) {
				console.log(e.message);
			}
		}
	});

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(condition)));
	$.delegated('click', button, () => $.set(condition, !$.get(condition)));
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);