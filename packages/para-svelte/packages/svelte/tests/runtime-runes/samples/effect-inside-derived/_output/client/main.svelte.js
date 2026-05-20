import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);

	const $$d = $.derived(() => {
			let value = $.state(0);

			$.user_effect(() => {
				$.set(value, $.get(count), true);
			});

			return {
				get value() {
					return $.get(value);
				}
			};
		}),
		value = $.derived(() => $.get($$d).value);

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${$.get(value) ?? ''}`));
	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);