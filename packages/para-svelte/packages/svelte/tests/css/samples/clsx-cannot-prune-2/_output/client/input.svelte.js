import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>hello world</h1>`);

export default function Input($$anchor) {
	var h1 = root();

	$.template_effect(($0) => $.set_class(h1, 1, $0, 'svelte-xyz'), [() => $.clsx({ foo: true, ...rest })]);
	$.append($$anchor, h1);
}