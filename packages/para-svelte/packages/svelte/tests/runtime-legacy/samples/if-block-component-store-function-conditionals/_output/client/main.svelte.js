import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import Widget from './Widget.svelte';

var root_2 = $.from_html(`<pre>fail</pre>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $a = () => $.store_get(a, '$a', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let a = writable({});
	let b = () => true;

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Widget($$anchor, {});
		};

		var d = $.derived(() => ($a(), $.untrack(() => $a() || b())));

		var alternate = ($$anchor) => {
			var pre = root_2();

			$.append($$anchor, pre);
		};

		$.if(node, ($$render) => {
			if ($.get(d)) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}