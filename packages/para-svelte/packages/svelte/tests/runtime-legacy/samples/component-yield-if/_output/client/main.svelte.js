import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let widget = $.prop($$props, 'widget', 12);
	let data = $.prop($$props, 'data', 12, "Hello");

	var $$exports = {
		get widget() {
			return widget();
		},

		set widget($$value) {
			widget($$value);
			$.flush();
		},

		get data() {
			return data();
		},

		set data($$value) {
			data($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	$.bind_this(
		Widget(node, {
			children: ($$anchor, $$slotProps) => {
				$.next();

				var text = $.text();

				$.template_effect(() => $.set_text(text, data()));
				$.append($$anchor, text);
			},
			$$slots: { default: true },
			$$legacy: true
		}),
		($$value) => widget($$value),
		() => widget()
	);

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}