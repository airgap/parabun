import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let widget = $.prop($$props, 'widget', 12);

	var $$exports = {
		get widget() {
			return widget();
		},

		set widget($$value) {
			widget($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	$.bind_this(Widget(node, { $$legacy: true }), ($$value) => widget($$value), () => widget());
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}