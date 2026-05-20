import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import foo from './foo.js';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	const $foo = () => $.store_get(foo, '$foo', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const answer = $foo();
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, answer));
	$.append($$anchor, p);
	$$cleanup();
}