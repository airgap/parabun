import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let name = $.mutable_source('Foo');
	let visible = $.mutable_source(true);

	function show() {
		$.set(visible, true);
	}

	function hide() {
		$.set(visible, false);
		$.set(name, 'Bar');
	}

	var $$exports = { show, hide };

	Nested($$anchor, {
		get visible() {
			return $.get(visible);
		},

		children: ($$anchor, $$slotProps) => {
			$.next();

			var text = $.text();

			$.template_effect(() => $.set_text(text, $.get(name)));
			$.append($$anchor, text);
		},
		$$slots: { default: true }
	});

	$.bind_prop($$props, 'show', show);
	$.bind_prop($$props, 'hide', hide);

	return $.pop($$exports);
}