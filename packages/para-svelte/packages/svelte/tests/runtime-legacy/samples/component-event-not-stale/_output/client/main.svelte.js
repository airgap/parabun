import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';
import Button from './Button.svelte';

var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();
	let value = $.prop($$props, 'value', 12);

	function handleClick() {
		dispatch('value', { value: value() });
	}

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	Button(node, {
		$$events: { click: handleClick },
		children: ($$anchor, $$slotProps) => {
			$.next();

			var text = $.text('one');

			$.append($$anchor, text);
		},
		$$slots: { default: true }
	});

	var node_1 = $.sibling(node, 2);

	Button(node_1, {
		$$events: { click: () => dispatch('value', { value: value() }) },
		children: ($$anchor, $$slotProps) => {
			$.next();

			var text_1 = $.text('two');

			$.append($$anchor, text_1);
		},
		$$slots: { default: true }
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}