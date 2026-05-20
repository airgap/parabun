import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>Hello!</h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let result = $.prop($$props, 'result', 12);

	function onMountAction(node) {
		result(result().parentElement = node.parentElement, true);
	}

	var $$exports = {
		get result() {
			return result();
		},

		set result($$value) {
			result($$value);
			$.flush();
		}
	};

	$.init();

	var h1 = root();

	$.action(h1, ($$node) => onMountAction?.($$node));
	$.append($$anchor, h1);

	return $.pop($$exports);
}