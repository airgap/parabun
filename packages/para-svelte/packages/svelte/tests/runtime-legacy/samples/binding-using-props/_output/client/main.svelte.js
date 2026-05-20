import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Input from './TextInput.svelte';

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let actualValue = $.prop($$props, 'actualValue', 12, '');

	var $$exports = {
		get actualValue() {
			return actualValue();
		},

		set actualValue($$value) {
			actualValue($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	Input(node, {
		get actualValue() {
			return actualValue();
		},

		set actualValue($$value) {
			actualValue($$value);
		},
		$$legacy: true
	});

	var p = $.sibling(node, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, actualValue()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}