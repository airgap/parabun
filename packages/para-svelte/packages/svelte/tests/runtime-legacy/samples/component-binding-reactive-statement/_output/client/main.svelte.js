import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Button from './Button.svelte';

var root = $.from_html(`<button> </button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.mutable_source(0);

	function handleClick() {
		$.set(count, $.get(count) + 1);
	}

	$.legacy_pre_effect(() => ($.get(count)), () => {
		if ($.get(count) > 2) {
			$.set(count, 2);
		}
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var node = $.sibling(button, 2);

	Button(node, {
		get count() {
			return $.get(count);
		},

		set count($$value) {
			$.set(count, $$value);
		},
		$$legacy: true
	});

	$.template_effect(() => $.set_text(text, `main ${$.get(count) ?? ''}`));
	$.event('click', button, handleClick);
	$.append($$anchor, fragment);
	$.pop();
}