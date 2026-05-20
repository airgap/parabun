import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { setContext, mount } from 'svelte';
import ChildComponent from './ChildComponent.svelte';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	setContext('foo', true);

	function render(node) {
		mount(ChildComponent, { target: node, context: new Map() });
	}

	$.init();

	var div = root();

	$.action(div, ($$node) => render?.($$node));
	$.append($$anchor, div);
	$.pop();
}