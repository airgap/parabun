import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import IconA from './IconA.svelte';
import IconB from './IconB.svelte';

var root = $.from_html(`<button>Click Me</button> <div><!></div>`, 1);

export default function Inner($$anchor, $$props) {
	let variable = $.mutable_source(false);
	var fragment = root();
	var button = $.first_child(fragment);
	var div = $.sibling(button, 2);
	var node = $.child(div);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.component(node_1, () => $.get(variable) ? IconA : IconB, ($$anchor, $$component) => {
			$$component($$anchor, {});
		});

		$.append($$anchor, fragment_1);
	});

	$.reset(div);
	$.event('click', button, () => $.set(variable, !$.get(variable)));
	$.append($$anchor, fragment);
}