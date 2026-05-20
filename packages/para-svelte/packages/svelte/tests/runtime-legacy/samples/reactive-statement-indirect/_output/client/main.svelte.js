import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1> <button>Increment</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const indirect_double = $.mutable_source();
	let count = $.mutable_source(1);

	$.legacy_pre_effect(() => {}, () => {
		$.set(indirect_double, 2);
	});

	$.legacy_pre_effect(() => ($.get(count)), () => {
		if ($.get(count) > 0) {
			$.set(indirect_double, $.get(count) * 2);
		}
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1, true);

	$.reset(h1);

	var button = $.sibling(h1, 2);

	$.template_effect(() => $.set_text(text, $.get(indirect_double)));
	$.event('click', button, () => $.update(count));
	$.append($$anchor, fragment);
	$.pop();
}