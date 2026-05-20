import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let nested = $.mutable_source();

	function show() {
		$.get(nested).show();
	}

	function hide() {
		$.get(nested).hide();
	}

	var $$exports = { show, hide };

	$.bind_this(
		Nested($$anchor, {
			children: $.invalid_default_snippet,
			$$slots: {
				default: ($$anchor, $$slotProps) => {
					const data = $.derived_safe_equal(() => $$slotProps.data);

					$.next();

					var text = $.text();

					$.template_effect(() => $.set_text(text, $.get(data)));
					$.append($$anchor, text);
				}
			},
			$$legacy: true
		}),
		($$value) => $.set(nested, $$value),
		() => $.get(nested)
	);

	$.bind_prop($$props, 'show', show);
	$.bind_prop($$props, 'hide', hide);

	return $.pop($$exports);
}