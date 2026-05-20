import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onDestroy } from 'svelte';
import container from './container.js';

var $$_import_container = $.reactive_import(() => container);
var root = $.from_html(`<div></div>`);

export default function Top($$anchor, $$props) {
	$.push($$props, false);

	let element = $.mutable_source();

	onDestroy(() => {
		$$_import_container($$_import_container().div = $.get(element));
	});

	$.init();

	var div = root();

	$.bind_this(div, ($$value) => $.set(element, $$value), () => $.get(element));
	$.append($$anchor, div);
	$.pop();
}