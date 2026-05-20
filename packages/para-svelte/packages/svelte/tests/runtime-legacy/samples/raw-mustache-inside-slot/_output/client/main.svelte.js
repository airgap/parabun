import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.from_html(`<button>Switch</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const content = $.mutable_source();
	let content1 = `<p>First line</p>`;
	let content2 = `<p>Another first line</p>`;
	let show = $.mutable_source(false);

	$.legacy_pre_effect(() => ($.get(show)), () => {
		$.set(content, $.get(show) ? content1 : content2);
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	Component(node, {
		children: ($$anchor, $$slotProps) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.html(node_1, () => $.get(content));
			$.append($$anchor, fragment_1);
		},
		$$slots: { default: true }
	});

	$.event('click', button, () => $.set(show, !$.get(show)));
	$.append($$anchor, fragment);
	$.pop();
}