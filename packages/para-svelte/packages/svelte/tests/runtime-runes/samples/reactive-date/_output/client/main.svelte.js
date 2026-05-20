import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { SvelteDate } from 'svelte/reactivity';

var root = $.from_html(`<div> </div> <div> </div> <div> </div> <div> </div> <div> </div> <button>1 second</button> <button>1 minute</button> <button>1 hour</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let date = new SvelteDate('2024-02-23T15:00:00Z');
	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var text_1 = $.child(div_1);

	$.reset(div_1);

	var div_2 = $.sibling(div_1, 2);
	var text_2 = $.child(div_2);

	$.reset(div_2);

	var div_3 = $.sibling(div_2, 2);
	var text_3 = $.child(div_3);

	$.reset(div_3);

	var div_4 = $.sibling(div_3, 2);
	var text_4 = $.child(div_4);

	$.reset(div_4);

	var button = $.sibling(div_4, 2);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);

	$.template_effect(
		($0, $1, $2, $3, $4) => {
			$.set_text(text, `getSeconds: ${$0 ?? ''}`);
			$.set_text(text_1, `getMinutes: ${$1 ?? ''}`);
			$.set_text(text_2, `getHours: ${$2 ?? ''}`);
			$.set_text(text_3, `getTime: ${$3 ?? ''}`);
			$.set_text(text_4, `toUTCString: ${$4 ?? ''}`);
		},
		[
			() => date.getUTCSeconds(),
			() => date.getUTCMinutes(),
			() => date.getUTCHours(),
			() => date.getTime(),
			() => date.toUTCString()
		]
	);

	$.delegated('click', button, () => {
		date.setSeconds(date.getSeconds() + 1);
	});

	$.delegated('click', button_1, () => {
		date.setMinutes(date.getMinutes() + 1);
	});

	$.delegated('click', button_2, () => {
		date.setHours(date.getHours() + 1);
	});

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);