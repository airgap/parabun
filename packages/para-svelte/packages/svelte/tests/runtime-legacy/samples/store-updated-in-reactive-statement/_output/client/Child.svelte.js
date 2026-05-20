import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import { store } from './state.js';

var root = $.from_html(`<p> </p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	const $copy = () => $.store_get(copy, '$copy', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let value = $.prop($$props, 'value', 12);
	const copy = writable(value());

	$.legacy_pre_effect(() => ($.deep_read_state(value()), store), () => {
		copy.set(value());
		store.set({ value: value() });
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $copy()));
	$.append($$anchor, p);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}