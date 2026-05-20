import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Field from './Field.svelte';
import { writable } from 'svelte/store';

var root = $.from_html(`<!> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $value = () => $.store_get(value, '$value', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const value = writable('aaa');

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	Field(node, {
		get value() {
			$.mark_store_binding();

			return $value();
		},

		set value($$value) {
			$.store_set(value, $$value);
		},
		$$legacy: true
	});

	var text = $.sibling(node);

	$.template_effect(() => $.set_text(text, ` ${$value() ?? ''}`));
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}