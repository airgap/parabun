import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let deep = $.prop($$props, 'deep', 28, () => ({ name: 'foo' }));

	var $$exports = {
		get deep() {
			return deep();
		},

		set deep($$value) {
			deep($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	Widget(node, {
		get value() {
			return deep().name;
		},

		set value($$value) {
			deep(deep().name = $$value, true);
		},
		$$legacy: true
	});

	var p = $.sibling(node, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, ($.deep_read_state(deep()), $.untrack(() => deep().name))));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}