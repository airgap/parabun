import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<details class="svelte-xyz">Hello</details>`);

export default function Input($$anchor) {
	let open = $.mutable_source(false);
	var details = root();

	$.bind_property('open', 'toggle', details, ($$value) => $.set(open, $$value), () => $.get(open));
	$.append($$anchor, details);
}