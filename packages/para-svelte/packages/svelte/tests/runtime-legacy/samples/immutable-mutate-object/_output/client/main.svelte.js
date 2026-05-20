import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button> </button>`, 1);

export default function Main($$anchor) {
	let name = $.mutable_source({ value: 0 }, true);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	$.template_effect(() => {
		$.set_text(text, ($.get(name), $.untrack(() => $.get(name).value)));
		$.set_text(text_1, ($.get(name), $.untrack(() => $.get(name).value)));
	});

	$.delegated('click', button, () => $.mutate(name, $.get(name).value++));
	$.delegated('click', button_1, () => $.set(name, { value: $.get(name).value + 1 }));
	$.append($$anchor, fragment);
}

$.delegate(['click']);