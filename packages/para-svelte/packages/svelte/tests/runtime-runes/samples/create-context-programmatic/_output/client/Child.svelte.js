import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { get } from './main.svelte';

var root = $.from_html(`<h1> </h1>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	const message = get();
	var h1 = root();
	var text = $.child(h1, true);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, message));
	$.append($$anchor, h1);
	$.pop();
}