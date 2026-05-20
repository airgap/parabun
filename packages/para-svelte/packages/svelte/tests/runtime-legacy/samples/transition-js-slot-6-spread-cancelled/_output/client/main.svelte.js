import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';
import Nested2 from './Nested2.svelte';

var root = $.from_html(`<div> </div> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.mutable_source(true);
	let state = $.mutable_source('Foo');
	let slotProps = $.mutable_source({ slotProps: 'Foo' });
	let props = $.prop($$props, 'props', 12);

	function show() {
		$.set(visible, true);
	}

	function hide() {
		$.set(visible, false);
		$.set(state, 'Bar');
		$.set(slotProps, { slotProps: 'Bar' });
	}

	var $$exports = {
		show,
		hide,
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var node = $.sibling(div, 2);

	Nested(node, {
		get visible() {
			return $.get(visible);
		},

		get slotProps() {
			return $.get(slotProps);
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const slotProps = $.derived_safe_equal(() => $$slotProps.slotProps);

				$.next();

				var text_1 = $.text();

				$.template_effect(() => $.set_text(text_1, `inside ${$.get(state) ?? ''} ${props() ?? ''} ${$.get(slotProps) ?? ''}`));
				$.append($$anchor, text_1);
			}
		}
	});

	var node_1 = $.sibling(node, 2);

	Nested2(node_1, {
		get visible() {
			return $.get(visible);
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const slotProps = $.derived_safe_equal(() => $$slotProps.slotProps);

				$.next();

				var text_2 = $.text();

				$.template_effect(() => $.set_text(text_2, `inside ${$.get(state) ?? ''} ${props() ?? ''} ${$.get(slotProps) ?? ''}`));
				$.append($$anchor, text_2);
			}
		}
	});

	$.template_effect(() => $.set_text(text, `outside ${$.get(state) ?? ''} ${props() ?? ''} ${(
		$.get(slotProps),
		$.untrack(() => $.get(slotProps).slotProps)
	) ?? ''}`));

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'show', show);
	$.bind_prop($$props, 'hide', hide);

	return $.pop($$exports);
}