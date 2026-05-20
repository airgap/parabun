import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

var root_1 = $.from_html(`<p></p>`);
var root = $.from_html(`<div>div</div> <!> <!>`, 1);

export default function Main($$anchor) {
	let ref = $.state(null);
	var foo;
	var $$promises = $.run([async () => foo = await $.async_derived(() => 1)]);
	var fragment = root();
	var div = $.first_child(fragment);

	$.bind_this(div, ($$value) => $.set(ref, $$value), () => $.get(ref));

	var node = $.sibling(div, 2);

	Component(node, {
		get ref() {
			return $.get(ref);
		}
	});

	var node_1 = $.sibling(node, 2);

	$.async(node_1, [$$promises[0]], void 0, (node_1) => {
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.if(node_1, ($$render) => {
			if ($.get(foo)) $$render(consequent);
		});
	});

	$.append($$anchor, fragment);
}