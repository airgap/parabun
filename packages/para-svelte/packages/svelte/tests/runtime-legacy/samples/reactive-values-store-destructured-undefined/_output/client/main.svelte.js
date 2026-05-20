import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $store = () => $.store_get(store, '$store', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const foo1 = $.mutable_source();
	const foo2 = $.mutable_source();
	const store = writable([]);

	$.legacy_pre_effect(() => ($.get(foo1), $store()), () => {
		(($$value) => {
			$.set(foo1, $$value.foo1);
		})($store());
	});

	$.legacy_pre_effect(() => ($.get(foo2), $store()), () => {
		(($$value) => {
			var $$array = $.to_array($$value, 1);

			$.set(foo2, $$array[0]);
		})($store());
	});

	$.legacy_pre_effect_reset();
	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, $.get(foo1));
		$.set_text(text_1, $.get(foo2));
	});

	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}