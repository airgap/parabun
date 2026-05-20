import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, '');

	if (value()) {
		setContext('test', value());
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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, null);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}