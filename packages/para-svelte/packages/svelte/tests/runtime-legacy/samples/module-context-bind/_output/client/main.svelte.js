import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

let foo;
var root = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let bar = $.mutable_source();

	onMount(() => $.set(bar, foo));
	$.init();

	var div = root();
	var text = $.child(div, true);

	$.reset(div);
	$.bind_this(div, ($$value) => foo = $$value, () => foo);
	$.template_effect(() => $.set_text(text, typeof $.get(bar)));
	$.append($$anchor, div);
	$.pop();
}