import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12, true);
	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.component(node, () => a() ? Foo : Bar, ($$anchor, $$component) => {
		$$component($$anchor, {
			get x() {
				return x();
			},

			set x($$value) {
				x($$value);
			},
			$$legacy: true
		});
	});

	var p = $.sibling(node, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `x in parent: ${x() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}