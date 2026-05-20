import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $foo = () => $.store_get(foo, '$foo', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const foo = writable(0);

	function increment() {
		$.update_store(foo, $foo());
	}

	var $$exports = { increment };

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $foo()));
	$.append($$anchor, text);
	$.bind_prop($$props, 'increment', increment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}