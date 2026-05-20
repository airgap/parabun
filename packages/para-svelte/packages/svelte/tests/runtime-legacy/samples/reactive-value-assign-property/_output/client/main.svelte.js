import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const user = $.mutable_source();

	$.legacy_pre_effect(() => {}, () => {
		$.set(user, {});
	});

	$.legacy_pre_effect(() => {}, () => {
		$.mutate(user, $.get(user).name = 'world');
	});

	$.legacy_pre_effect_reset();

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `Hello ${($.get(user), $.untrack(() => $.get(user).name)) ?? ''}!`));
	$.append($$anchor, h1);
	$.pop();
}