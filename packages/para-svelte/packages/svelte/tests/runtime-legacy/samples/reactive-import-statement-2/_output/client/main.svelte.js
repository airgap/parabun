import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { obj } from './data.js';

var $$_import_obj = $.reactive_import(() => obj);
var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const prop = $.mutable_source();

	$$_import_obj($$_import_obj().foo = 'a different prop');

	$.legacy_pre_effect(() => ($$_import_obj()), () => {
		$.set(prop, $$_import_obj().prop);
	});

	$.legacy_pre_effect_reset();
	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(prop)));
	$.append($$anchor, p);
	$.pop();
}