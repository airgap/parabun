import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';
import Baz from './Baz.svelte';

var root_2 = $.from_html(`<p>foo</p>`);
var root_3 = $.from_html(`<p>bar</p>`);
var root_4 = $.from_html(`<p>neither foo nor bar</p>`);
var root_5 = $.from_html(`<span> </span>`);
var root_1 = $.from_html(`<p>element</p> <!> text <!> <!>`, 1);
var root_6 = $.from_html(`<div slot="other">what goes up must come down</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);
	let tag = $.prop($$props, 'tag', 12, 'you\'re it');
	let foo = $.prop($$props, 'foo', 12);
	let bar = $.prop($$props, 'bar', 12);
	let things = $.prop($$props, 'things', 28, () => ['a', 'b', 'c']);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get tag() {
			return tag();
		},

		set tag($$value) {
			tag($$value);
			$.flush();
		},

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
		},

		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => x() ? Foo : Bar, ($$anchor, $$component) => {
		$$component($$anchor, {
			get x() {
				return x();
			},

			children: ($$anchor, $$slotProps) => {
				var fragment_1 = root_1();
				var text = $.sibling($.first_child(fragment_1));
				var node_1 = $.sibling(text);

				{
					var consequent = ($$anchor) => {
						var p = root_2();

						$.append($$anchor, p);
					};

					var consequent_1 = ($$anchor) => {
						var p_1 = root_3();

						$.append($$anchor, p_1);
					};

					var alternate = ($$anchor) => {
						var p_2 = root_4();

						$.append($$anchor, p_2);
					};

					$.if(node_1, ($$render) => {
						if (foo()) $$render(consequent); else if (bar()) $$render(consequent_1, 1); else $$render(alternate, -1);
					});
				}

				var node_2 = $.sibling(node_1, 2);

				$.each(node_2, 1, things, $.index, ($$anchor, thing) => {
					var span = root_5();
					var text_1 = $.child(span, true);

					$.reset(span);
					$.template_effect(() => $.set_text(text_1, $.get(thing)));
					$.append($$anchor, span);
				});

				var node_3 = $.sibling(node_2, 2);

				Baz(node_3, {});
				$.template_effect(() => $.set_text(text, ` ${tag() ?? ''} `));
				$.append($$anchor, fragment_1);
			},

			$$slots: {
				default: true,
				other: ($$anchor, $$slotProps) => {
					var div = root_6();

					$.append($$anchor, div);
				}
			}
		});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}