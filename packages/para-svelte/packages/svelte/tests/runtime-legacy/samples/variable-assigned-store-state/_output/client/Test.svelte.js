import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button></button> <p> </p>`, 1);

export default function Test($$anchor, $$props) {
	$.push($$props, false);

	const $currentStore = () => $.store_get($.get(currentStore), '$currentStore', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let store = $.prop($$props, 'store', 12);
	let currentStore = $.mutable_source();

	function update() {
		$.store_unsub($.set(currentStore, store()), '$currentStore', $$stores);
	}

	var $$exports = {
		get store() {
			return store();
		},

		set store($$value) {
			store($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $currentStore()));
	$.event('click', button, update);
	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}