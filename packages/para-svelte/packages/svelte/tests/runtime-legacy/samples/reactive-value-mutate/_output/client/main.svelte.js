import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.mutable_source({});
	let bar = 42;

	$.legacy_pre_effect(() => {}, () => {
		$.mutate(foo, $.get(foo).bar = bar);
	});

	$.legacy_pre_effect_reset();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [
		() => ($.get(foo), $.untrack(() => JSON.stringify($.get(foo))))
	]);

	$.append($$anchor, text);
	$.pop();
}