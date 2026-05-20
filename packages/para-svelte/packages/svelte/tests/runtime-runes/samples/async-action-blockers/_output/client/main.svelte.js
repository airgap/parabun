import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	// Wait a macrotask to make sure the effect doesn't run before the microtask-Promise.resolve() resolves, masking a bug
	function run(_, arg) {
		console.log(arg);
	}

	var value;

	var $$promises = $.run([
		() => new Promise((r) => setTimeout(r)),
		() => value = 'ready'
	]);

	var div = root();

	$.run_after_blockers([$$promises[1]], () => {
		$.action(div, ($$node, $$action_arg) => run?.($$node, $$action_arg), () => value);
	});

	$.append($$anchor, div);
	$.pop();
}