import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span>foo</span>`);

export default function Main($$anchor) {
	var span = root();

	$.set_attribute(span, 'title', "\"foo\"");
	$.append($$anchor, span);
}