import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root_2 = $.from_html(`<div> </div>`);
var root_4 = $.from_html(`<div> </div>`);
var root_5 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let props = $.prop($$props, 'props', 12, "dynamic");

	var $$exports = {
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	Component(node, {
		children: ($$anchor, $$slotProps) => {
			const foo = $.derived_safe_equal(() => "static");
			const bar = $.derived_safe_equal(props);
			var div = root_2();
			var text = $.child(div);

			$.reset(div);
			$.template_effect(() => $.set_text(text, `${$.get(foo) ?? ''} ${$.get(bar) ?? ''}`));
			$.append($$anchor, div);
		},

		$$slots: {
			default: true,
			box1: ($$anchor, $$slotProps) => {
				const foo = $.derived_safe_equal(() => "static");
				const bar = $.derived_safe_equal(props);
				var div_1 = root_4();
				var text_1 = $.child(div_1);

				$.reset(div_1);
				$.template_effect(() => $.set_text(text_1, `${$.get(foo) ?? ''} ${$.get(bar) ?? ''}`));
				$.append($$anchor, div_1);
			}
		}
	});

	var node_1 = $.sibling(node, 2);

	Component(node_1, {
		children: ($$anchor, $$slotProps) => {
			const foo = $.derived_safe_equal(() => "static");
			const bar = $.derived_safe_equal(props);
			var div_2 = root_5();
			var text_2 = $.child(div_2);

			$.reset(div_2);
			$.template_effect(() => $.set_text(text_2, `${$.get(foo) ?? ''} ${$.get(bar) ?? ''}`));
			$.append($$anchor, div_2);
		},
		$$slots: { default: true }
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}