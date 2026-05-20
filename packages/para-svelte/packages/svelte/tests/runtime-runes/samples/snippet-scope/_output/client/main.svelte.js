import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root_2 = $.from_html(`<a> </a>`);
var root_1 = $.from_html(`<p> </p> <!>`, 1);

export default function Main($$anchor) {
	let name = "Svelte";
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 17, () => name.split(''), $.index, ($$anchor, character) => {
		var fragment_1 = root_1();
		var p = $.first_child(fragment_1);
		var text = $.child(p, true);

		$.reset(p);

		var node_1 = $.sibling(p, 2);

		{
			const inner = ($$anchor) => {
				var a = root_2();

				$.set_attribute(a, 'href', '#');

				var text_1 = $.child(a, true);

				$.reset(a);
				$.template_effect(() => $.set_text(text_1, $.get(character)));
				$.append($$anchor, a);
			};

			Component(node_1, { inner, $$slots: { inner: true } });
		}

		$.template_effect(() => $.set_text(text, $.get(character)));
		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}