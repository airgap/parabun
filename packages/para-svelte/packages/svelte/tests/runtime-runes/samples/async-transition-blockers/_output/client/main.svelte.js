import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	// Wait a macrotask to make sure the effect doesn't run before the microtask-Promise.resolve() resolves, masking a bug
	function custom(_, value) {
		console.log(value);

		return { duration: 0 };
	}

	var params;

	var $$promises = $.run([
		() => new Promise((r) => setTimeout(r)),
		() => params = 'ready'
	]);

	var div = root();

	$.run_after_blockers([$$promises[1]], () => {
		$.transition(3, div, () => custom, () => params);
	});

	$.append($$anchor, div);
	$.pop();
}