import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let people = $.prop($$props, 'people', 28, () => ['Alice', 'Bob', 'Charles']);

	var $$exports = {
		get people() {
			return people();
		},

		set people($$value) {
			people($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, people, $.index, ($$anchor, person) => {
		Widget($$anchor, {
			children: ($$anchor, $$slotProps) => {
				$.next();

				var text = $.text();

				$.template_effect(() => $.set_text(text, `Hello ${$.get(person) ?? ''}`));
				$.append($$anchor, text);
			},
			$$slots: { default: true }
		});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}