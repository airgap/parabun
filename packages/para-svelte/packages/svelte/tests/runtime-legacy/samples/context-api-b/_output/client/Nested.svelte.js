import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { getContext, setContext } from 'svelte';

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12, '');
	const parentName = getContext('test');

	setContext('test', parentName ? parentName + '/' + name() : name());

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
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