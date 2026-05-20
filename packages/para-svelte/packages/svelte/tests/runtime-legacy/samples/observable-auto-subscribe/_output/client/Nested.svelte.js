import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	const $observable = () => $.store_get(observable(), '$observable', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let observable = $.prop($$props, 'observable', 12);

	var $$exports = {
		get observable() {
			return observable();
		},

		set observable($$value) {
			observable($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `value: ${$observable() ?? ''}`));
	$.append($$anchor, p);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}