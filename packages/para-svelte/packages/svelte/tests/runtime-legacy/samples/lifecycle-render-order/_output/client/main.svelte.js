import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount, beforeUpdate, afterUpdate } from 'svelte';
import order from './order.js';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	function identity(x) {
		order.push('render');

		return x;
	}

	beforeUpdate(() => {
		order.push('beforeUpdate');
	});

	afterUpdate(() => {
		order.push('afterUpdate');
	});

	onMount(() => {
		order.push('onMount');
	});

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [() => ($.untrack(() => identity(42)))]);
	$.append($$anchor, text);
	$.pop();
}