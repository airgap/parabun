import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>Hello world</div>`);

export default function Input($$anchor) {
	const enabled = true;
	var div = root();

	$.set_class(div, 1, 'svelte-xyz', null, {}, { 'foo:bar': enabled });
	$.append($$anchor, div);
}