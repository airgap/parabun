import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

var root = $.from_html(`<!> <div> </div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.bind_this(Foo(node, { $$legacy: true }), ($$value) => foo($$value), () => foo());

	var div = $.sibling(node, 2);
	var text = $.child(div);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `has foo: ${!!foo()}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}