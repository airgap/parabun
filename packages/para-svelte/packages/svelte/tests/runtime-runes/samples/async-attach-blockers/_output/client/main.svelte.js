import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from "./Child.svelte";

var root = $.from_html(`<div></div> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	// Wait a macrotask to make sure the effect doesn't run before the microtask-Promise.resolve() resolves, masking a bug
	function createAttachment(value) {
		return () => {
			console.log(value);
		};
	}

	var attachment;

	var $$promises = $.run([
		() => new Promise((r) => setTimeout(r)),
		() => attachment = 'ready'
	]);

	var fragment = root();
	var div = $.first_child(fragment);

	$.run_after_blockers([$$promises[1]], () => {
		$.attach(div, () => createAttachment(attachment));
	});

	var node = $.sibling(div, 2);

	$.async(node, [$$promises[1]], void 0, ($$anchor) => {
		Child(node, {
			[$.attachment()]: ($$node) => (createAttachment(attachment) || $.noop)($$node)
		});
	});

	$.append($$anchor, fragment);
	$.pop();
}