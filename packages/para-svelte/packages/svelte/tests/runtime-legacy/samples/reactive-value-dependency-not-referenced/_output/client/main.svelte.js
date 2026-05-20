import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $store = () => $.store_get(store, '$store', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let store = writable(42);
	let variable = $.mutable_source(42);
	let value = $.mutable_source();
	let value2 = $.mutable_source();

	function updateStore(value) {
		store.set(value);
	}

	function updateVar(value) {
		$.set(variable, value);
	}

	$.legacy_pre_effect(() => ($store()), () => {
		$.set(value, $store());
	});

	$.legacy_pre_effect(() => ($.get(variable)), () => {
		$.set(value2, $.get(variable));
	});

	$.legacy_pre_effect_reset();

	var $$exports = { updateStore, updateVar };

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, $.get(value));
		$.set_text(text_1, $.get(value2));
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'updateStore', updateStore);
	$.bind_prop($$props, 'updateVar', updateVar);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}