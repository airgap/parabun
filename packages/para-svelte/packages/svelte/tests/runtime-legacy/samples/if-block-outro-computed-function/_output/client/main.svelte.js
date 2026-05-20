import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const bar = $.mutable_source();
	let foo = $.prop($$props, 'foo', 12, true);

	$.legacy_pre_effect(() => {}, () => {
		$.set(bar, () => true);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Foo($$anchor, {});
		};

		var consequent_1 = ($$anchor) => {
			var text = $.text('bar');

			$.append($$anchor, text);
		};

		var d = $.derived(() => ($.get(bar), $.untrack(() => $.get(bar)())));

		var alternate = ($$anchor) => {
			var text_1 = $.text('else');

			$.append($$anchor, text_1);
		};

		$.if(node, ($$render) => {
			if (foo()) $$render(consequent); else if ($.get(d)) $$render(consequent_1, 1); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}