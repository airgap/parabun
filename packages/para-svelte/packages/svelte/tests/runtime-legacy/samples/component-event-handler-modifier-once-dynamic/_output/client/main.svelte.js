import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Button from './Button.svelte';

var root = $.from_html(`<button>update handler</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12, 0);
	let clickHandler = $.mutable_source(() => count(count() + 1));

	function updateHandler() {
		$.set(clickHandler, () => count(count() + 10));
	}

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	Button(node, {
		$$events: {
			click: $.once(function (...$$args) {
				$.get(clickHandler)?.apply(this, $$args);
			})
		},

		children: ($$anchor, $$slotProps) => {
			$.next();

			var text = $.text();

			$.template_effect(() => $.set_text(text, count()));
			$.append($$anchor, text);
		},
		$$slots: { default: true }
	});

	$.event('click', button, updateHandler);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}