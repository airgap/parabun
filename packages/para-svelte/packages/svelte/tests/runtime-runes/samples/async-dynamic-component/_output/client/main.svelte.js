import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.from_html(`<!> <!> <!> <!>`, 1);

export default function Main($$anchor) {
	var X, Y;

	var $$promises = $.run([
		async () => X = await $.async_derived(() => Promise.resolve(Component)),
		async () => Y = await Promise.resolve(Component)
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[0]], void 0, ($$anchor) => {
		$.component(node, () => $.get(X), ($$anchor, X_1) => {
			X_1($$anchor, {});
		});
	});

	var node_1 = $.sibling(node, 2);

	$.async(node_1, [$$promises[0]], void 0, ($$anchor) => {
		$.component(node_1, () => $.get(X), ($$anchor, $$component) => {
			$$component($$anchor, {});
		});
	});

	var node_2 = $.sibling(node_1, 2);

	$.async(node_2, [$$promises[1]], void 0, ($$anchor) => {
		Y(node_2, {});
	});

	var node_3 = $.sibling(node_2, 2);

	$.async(node_3, [$$promises[1]], void 0, ($$anchor) => {
		$.component(node_3, () => Y, ($$anchor, $$component) => {
			$$component($$anchor, {});
		});
	});

	$.append($$anchor, fragment);
}