import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>red</p>`);

export default function Main($$anchor) {
	var p = root();

	$.set_style(p, null, {}, { color: 'red' });
	$.append($$anchor, p);
}