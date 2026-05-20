import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>change handlers</button> <button> </button>`, 1);

export default function Main($$anchor) {
	let delegated = $.state(0);
	let non_delegated = $.state(0);

	let attrs = $.state($.proxy({
		onclick: () => {
			$.set(delegated, $.get(delegated) + 1);
		},

		onclickcapture: () => {
			$.set(non_delegated, $.get(non_delegated) + 1);
		}
	}));

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);

	$.attribute_effect(button_1, () => ({ ...$.get(attrs) }));

	var text = $.child(button_1);

	$.reset(button_1);
	$.template_effect(() => $.set_text(text, `${$.get(delegated) ?? ''} / ${$.get(non_delegated) ?? ''}`));

	$.delegated('click', button, () => $.set(
		attrs,
		{
			onclick: () => {
				$.set(delegated, $.get(delegated) + 2);
			},

			onclickcapture: () => {
				$.set(non_delegated, $.get(non_delegated) + 2);
			}
		},
		true
	));

	$.append($$anchor, fragment);
}

$.delegate(['click']);