import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const array = $.mutable_source();
	const count = $.mutable_source();
	const sum = $.mutable_source();
	let x = $.mutable_source(1);
	let y = $.mutable_source(true);

	$.legacy_pre_effect(() => ($.get(y)), () => {
		$.set(array, $.get(y) ? [1, 2] : [1]);
	});

	$.legacy_pre_effect(() => ($.get(array), $.get(x)), () => {
		$.set(count, $.get(array).length === 2 && $.get(x) ? 1 : 0);
	});

	$.legacy_pre_effect(() => ($.get(count), $.get(array)), () => {
		$.set(sum, $.get(count) + $.get(array).length);
	});

	$.legacy_pre_effect_reset();

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(sum)));

	$.event('click', button, () => {
		// order is important here: x must be updated before y
		// in order to test that $: still runs in the correct order
		$.set(x, 2);

		$.set(y, false);
	});

	$.append($$anchor, button);
	$.pop();
}