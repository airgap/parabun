import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { count } from './stores';

var root = $.from_html(`<button> </button>`);

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	const $count = () => $.store_get(count, '$count', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let n = $.mutable_source(0);

	$.legacy_pre_effect(() => ($.get(n)), () => {
		$.store_set(count, $.get(n));
	});

	$.legacy_pre_effect_reset();

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $count()));
	$.delegated('click', button, () => $.set(n, $.get(n) + 1));
	$.append($$anchor, button);
	$.pop();
	$$cleanup();
}

$.delegate(['click']);