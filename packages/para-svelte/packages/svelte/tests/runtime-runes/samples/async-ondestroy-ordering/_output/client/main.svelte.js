import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { onDestroy } from 'svelte';
import { destroyed } from './destroyed.js';
import A from './A.svelte';
import B from './B.svelte';

var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);
	onDestroy(() => destroyed.push('root'));

	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [], [() => Promise.resolve(true)], (node, $$condition) => {
		var consequent = ($$anchor) => {
			A($$anchor, {});
		};

		$.if(node, ($$render) => {
			if ($.get($$condition)) $$render(consequent);
		});
	});

	var node_1 = $.sibling(node, 2);

	B(node_1, {});
	$.append($$anchor, fragment);
	$.pop();
}