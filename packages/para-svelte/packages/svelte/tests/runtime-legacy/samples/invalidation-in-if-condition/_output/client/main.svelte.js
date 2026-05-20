import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor) {
	let current = $.mutable_source({ active: false });
	let count = $.mutable_source(0);

	function toggle() {
		if ($.mutate(current, $.get(current).active = !$.get(current).active)) {
			$.set(count, $.get(count) + 1);
		}
	}

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `${($.get(current), $.untrack(() => $.get(current).active)) ?? ''} ${$.get(count) ?? ''}`));
	$.event('click', button, toggle);
	$.append($$anchor, button);
}