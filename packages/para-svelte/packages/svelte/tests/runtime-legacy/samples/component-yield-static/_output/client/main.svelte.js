import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<!> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12, '');

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	Widget(node, {
		children: ($$anchor, $$slotProps) => {
			$.next();

			var text = $.text('Hello');

			$.append($$anchor, text);
		},
		$$slots: { default: true }
	});

	var text_1 = $.sibling(node);

	$.template_effect(() => $.set_text(text_1, ` ${name() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}