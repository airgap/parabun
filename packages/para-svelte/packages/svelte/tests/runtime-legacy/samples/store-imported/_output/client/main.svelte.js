import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import foo from './foo.js';

var root = $.add_locations($.from_html(`<p> </p>`), Main[$.FILENAME], [[6, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	const $foo = () => (
		$.validate_store(foo, 'foo'),
		$.store_get(foo, '$foo', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	const answer = $foo();
	var $$exports = { ...$.legacy_api() };
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, answer));
	$.append($$anchor, p);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}