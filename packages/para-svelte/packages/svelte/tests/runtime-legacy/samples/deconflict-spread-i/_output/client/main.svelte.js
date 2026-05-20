import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<i></i>`);

export default function Main($$anchor) {
	const attrs = {};
	var i = root();

	$.attribute_effect(i, () => ({ ...attrs }));
	$.append($$anchor, i);
}