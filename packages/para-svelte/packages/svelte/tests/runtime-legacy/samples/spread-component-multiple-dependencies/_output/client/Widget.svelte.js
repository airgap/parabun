import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let baz = $.prop($$props, 'baz', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get baz() {
			return baz();
		},

		set baz($$value) {
			baz($$value);
			$.flush();
		}
	};

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `${foo() ?? ''} ${baz() ?? ''}`));
	$.append($$anchor, text);

	return $.pop($$exports);
}