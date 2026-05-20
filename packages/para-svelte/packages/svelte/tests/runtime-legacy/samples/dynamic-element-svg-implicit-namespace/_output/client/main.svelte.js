import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	// ensure these are treated as dynamic, despite whatever
	// optimisations we might apply
	let svg = $.prop($$props, 'svg', 12, 'svg');

	let path = $.prop($$props, 'path', 12, 'path');

	var $$exports = {
		get svg() {
			return svg();
		},

		set svg($$value) {
			svg($$value);
			$.flush();
		},

		get path() {
			return path();
		},

		set path($$value) {
			path($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, svg, true, ($$element, $$anchor) => {
		$.attribute_effect($$element, () => ({ xmlns: 'http://www.w3.org/2000/svg' }));

		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.element(node_1, path, true);
		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}