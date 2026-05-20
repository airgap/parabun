import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<span> </span>`);
var root = $.from_html(`<button>mutate</button> <!>`, 1);

export default function Main($$anchor) {
	let things = $.mutable_source([{ text: 'hello' }]);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	Nested(node, {
		get things() {
			return $.get(things);
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const thing = $.derived_safe_equal(() => $$slotProps.thing);
				var span = root_1();
				var text = $.child(span, true);

				$.reset(span);

				$.template_effect(() => $.set_text(text, (
					$.deep_read_state($.get(thing)),
					$.untrack(() => $.get(thing).text)
				)));

				$.append($$anchor, span);
			}
		}
	});

	$.event('click', button, () => $.mutate(things, $.get(things)[0].text = 'bye'));
	$.append($$anchor, fragment);
}