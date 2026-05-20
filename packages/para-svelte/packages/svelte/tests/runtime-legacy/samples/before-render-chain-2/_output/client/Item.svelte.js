import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { beforeUpdate } from 'svelte';

var root = $.from_html(`<button> </button>`);

export default function Item($$anchor, $$props) {
	$.push($$props, false);

	let count1 = $.mutable_source(0);
	let count2 = $.mutable_source(0);

	function increaseCount1() {
		$.update(count1);
	}

	beforeUpdate(() => {
		// We don't need to do anything
	});

	$.legacy_pre_effect(() => ($.get(count1), $.get(count2)), () => {
		if ($.get(count1) < 10) {
			$.update(count2);
		}
	});

	$.legacy_pre_effect(() => ($.get(count2)), () => {
		if ($.get(count2) < 10) {
			increaseCount1();
		}
	});

	$.legacy_pre_effect_reset();
	$.init();

	var // We don't need to do anything
	button = root();

	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `${$.get(count1) ?? ''} / ${$.get(count2) ?? ''}`));
	$.event('click', button, () => $.update(count1));
	$.append($$anchor, button);
	$.pop();
}