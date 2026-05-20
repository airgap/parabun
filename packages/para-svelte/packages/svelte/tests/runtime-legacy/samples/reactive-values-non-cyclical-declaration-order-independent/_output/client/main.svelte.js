import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const c = $.mutable_source();
	const a = $.mutable_source();
	const b = $.mutable_source();

	$.legacy_pre_effect(() => {}, () => {
		$.set(a, 2);
	});

	$.legacy_pre_effect(() => ($.get(a)), () => {
		$.set(b, $.get(a));
	});

	$.legacy_pre_effect(() => ($.get(a), $.get(b)), () => {
		$.set(c, $.get(a) + $.get(b));
	});

	$.legacy_pre_effect_reset();

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${$.get(a) ?? ''}+${$.get(b) ?? ''}=${$.get(c) ?? ''}`));
	$.append($$anchor, p);
	$.pop();
}