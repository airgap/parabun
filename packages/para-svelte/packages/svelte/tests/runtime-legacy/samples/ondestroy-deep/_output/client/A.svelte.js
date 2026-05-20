import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onDestroy } from 'svelte';
import { destroyed } from './destroyed.js';
import B from './B.svelte';

var root = $.from_html(`<div><!></div>`);

export default function A($$anchor, $$props) {
	$.push($$props, false);

	let yes = 1;

	onDestroy(() => destroyed.push('A'));
	$.init();

	var div = root();
	var node = $.child(div);

	{
		var consequent = ($$anchor) => {
			B($$anchor, {});
		};

		$.if(node, ($$render) => {
			if (yes) $$render(consequent);
		});
	}

	$.reset(div);
	$.append($$anchor, div);
	$.pop();
}