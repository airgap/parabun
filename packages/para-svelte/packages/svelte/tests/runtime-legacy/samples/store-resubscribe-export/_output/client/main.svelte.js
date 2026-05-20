import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $foo = () => $.store_get(foo(), '$foo', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let foo = $.prop($$props, 'foo', 28, () => writable(0));

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	$.init();

	var h1 = root();
	var text = $.child(h1, true);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, $foo()));
	$.append($$anchor, h1);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}