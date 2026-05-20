import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

const foo = ($$anchor) => {
	var x = root_1();

	$.append($$anchor, x);
};

var root_1 = $.from_html(`<x class="svelte-xyz"><y class="svelte-xyz"></y></x>`);

export default function Input($$anchor) {
	foo($$anchor);
}