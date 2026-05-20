import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $store = () => $.store_get(store(), '$store', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let store = $.prop($$props, 'store', 12);

	var $$exports = {
		get store() {
			return store();
		},

		set store($$value) {
			store($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $store()));
	$.append($$anchor, p);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}