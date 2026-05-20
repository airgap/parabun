import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let widgets = $.prop($$props, 'widgets', 28, () => [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }]);

	var $$exports = {
		get widgets() {
			return widgets();
		},

		set widgets($$value) {
			widgets($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, widgets, $.index, ($$anchor, widget, i) => {
		Widget($$anchor, {
			get widget() {
				return $.get(widget);
			},
			index: i
		});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}