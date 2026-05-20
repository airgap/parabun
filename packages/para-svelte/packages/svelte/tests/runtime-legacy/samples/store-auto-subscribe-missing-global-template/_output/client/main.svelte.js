import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	const $missingGlobal = () => $.store_get(missingGlobal, '$missingGlobal', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $missingGlobal()));
	$.append($$anchor, p);
	$$cleanup();
}