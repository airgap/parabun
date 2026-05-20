import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

const testSnippet = ($$anchor) => {
	var p = root_1();

	$.append($$anchor, p);
};

var root_1 = $.from_html(`<p>hi again</p>`);

export default function Main($$anchor) {
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, testSnippet));
	$.append($$anchor, text);
}