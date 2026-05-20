import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>a</div>`);

export default function A($$anchor) {
	function a(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.a = t;
			}
		};
	}

	var div = root();

	$.transition(3, div, () => a);
	$.append($$anchor, div);
}