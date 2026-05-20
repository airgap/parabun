import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

var root_1 = $.from_html(`<!> <div> </div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 28, () => ({}));

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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 0, () => ["first", "second", "third"], $.index, ($$anchor, value) => {
		var fragment_1 = root_1();
		var node_1 = $.first_child(fragment_1);

		$.bind_this(Foo(node_1, { $$legacy: true }), ($$value, value) => foo(foo()[value] = $$value, true), (value) => foo()?.[value], () => [value]);

		var div = $.sibling(node_1, 2);
		var text = $.child(div);

		$.reset(div);

		$.template_effect(() => $.set_text(text, `${value ?? ''} has foo: ${(
			$.deep_read_state(foo()),
			value,
			$.untrack(() => !!foo()[value])
		) ?? ''}`));

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}