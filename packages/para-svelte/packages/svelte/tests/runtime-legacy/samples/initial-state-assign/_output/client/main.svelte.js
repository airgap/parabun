import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, 'foo');
	let bar = $.prop($$props, 'bar', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		}
	};

	$.next();

	var text = $.text();

	$.template_effect(
		($0, $1) => $.set_text(text, `${$0 ?? ''}
${$1 ?? ''}`),
		[
			() => (
				$.deep_read_state(foo()),
				$.untrack(() => JSON.stringify(foo()))
			),

			() => (
				$.deep_read_state(bar()),
				$.untrack(() => JSON.stringify(bar()))
			)
		]
	);

	$.append($$anchor, text);

	return $.pop($$exports);
}