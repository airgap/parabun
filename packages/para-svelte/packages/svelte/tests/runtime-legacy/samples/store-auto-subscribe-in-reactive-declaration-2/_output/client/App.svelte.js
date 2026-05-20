import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div> <div> </div>`, 1);

export default function App($$anchor, $$props) {
	$.push($$props, false);

	const $store = () => $.store_get($.get(store), '$store', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const store = $.mutable_source();
	const value = $.mutable_source();
	let store_container = $.prop($$props, 'store_container', 12);

	$.legacy_pre_effect(() => ($.get(store), $.deep_read_state(store_container())), () => {
		(($$value) => {
			$.store_unsub($.set(store, $$value.store), '$store', $$stores);
		})(store_container());
	});

	$.legacy_pre_effect(() => ($store()), () => {
		$.set(value, $store());
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get store_container() {
			return store_container();
		},

		set store_container($$value) {
			store_container($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div, true);

	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var text_1 = $.child(div_1, true);

	$.reset(div_1);

	$.template_effect(() => {
		$.set_text(text, $.get(value));
		$.set_text(text_1, $store());
	});

	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}