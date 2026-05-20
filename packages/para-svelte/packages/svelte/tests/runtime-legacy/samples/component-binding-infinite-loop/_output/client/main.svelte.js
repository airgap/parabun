import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';

var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let currentIdentifier = $.prop($$props, 'currentIdentifier', 12, 2);

	var $$exports = {
		get currentIdentifier() {
			return currentIdentifier();
		},

		set currentIdentifier($$value) {
			currentIdentifier($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	A(node, {
		get currentIdentifier() {
			return currentIdentifier();
		},

		set currentIdentifier($$value) {
			currentIdentifier($$value);
		},
		$$legacy: true
	});

	var node_1 = $.sibling(node, 2);

	A(node_1, {
		get currentIdentifier() {
			return currentIdentifier();
		},

		set currentIdentifier($$value) {
			currentIdentifier($$value);
		},
		$$legacy: true
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}