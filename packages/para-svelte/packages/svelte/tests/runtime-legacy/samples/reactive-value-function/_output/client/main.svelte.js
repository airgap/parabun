import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.mutable_source(() => 1);

	var bar = $.mutable_source(function () {
		return 2;
	});

	function update() {
		$.set(foo, () => 3);
		$.set(bar, () => 4);
	}

	var $$exports = { update };

	$.next();

	var text = $.text();

	$.template_effect(($0, $1) => $.set_text(text, `${$0 ?? ''}-${$1 ?? ''}`), [
		() => ($.get(foo), $.untrack(() => $.get(foo)())),
		() => ($.safe_get(bar), $.untrack(() => $.safe_get(bar)()))
	]);

	$.append($$anchor, text);
	$.bind_prop($$props, 'update', update);

	return $.pop($$exports);
}