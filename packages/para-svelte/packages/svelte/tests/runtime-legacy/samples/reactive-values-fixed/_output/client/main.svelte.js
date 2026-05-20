import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const squared = $.mutable_source();
	const num = 2;

	$.legacy_pre_effect(() => {}, () => {
		$.set(squared, num * num);
	});

	$.legacy_pre_effect_reset();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(squared)));
	$.append($$anchor, p);
	$.pop();
}