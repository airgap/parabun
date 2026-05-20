import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { slide } from 'svelte/transition';

var root = $.from_html(`<button id="button">toggle</button> <div id="container"><!></div>`, 1);

export default function Main($$anchor) {
	let tag = $.mutable_source('div');

	function toggle() {
		$.set(tag, $.get(tag) ? null : 'div');
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.sibling(button);
	var div = $.sibling(text);
	var node = $.child(div);

	$.element(node, () => $.get(tag), false, ($$element, $$anchor) => {
		$.transition(3, $$element, () => slide, () => ({ duration: 500 }));

		var text_1 = $.text('CONTENT');

		$.append($$anchor, text_1);
	});

	$.reset(div);
	$.template_effect(() => $.set_text(text, ` TAG=${$.get(tag) ?? ''} `));
	$.event('click', button, toggle);
	$.append($$anchor, fragment);
}