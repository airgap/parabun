import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $foo = () => $.store_get(foo, '$foo', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const bar = $.mutable_source();
	const foo = writable([]);

	function go() {
		$foo().push(42);
		$.store_set(foo, $foo());
	}

	$.legacy_pre_effect(() => ($foo()), () => {
		$.set(bar, $foo());
	});

	$.legacy_pre_effect_reset();

	var $$exports = { go };

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [
		() => ($.get(bar), $.untrack(() => JSON.stringify($.get(bar))))
	]);

	$.append($$anchor, text);
	$.bind_prop($$props, 'go', go);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}