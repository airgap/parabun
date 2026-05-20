import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Inner from './Inner.svelte';

var root = $.from_html(`<button>click me</button> <!>`, 1);

export default function Widget($$anchor, $$props) {
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	Inner(node, {
		$$events: {
			bar($$arg) {
				$.bubble_event.call(this, $$props, $$arg);
			}
		}
	});

	$.event('click', button, function ($$arg) {
		$.bubble_event.call(this, $$props, $$arg);
	});

	$.append($$anchor, fragment);
}