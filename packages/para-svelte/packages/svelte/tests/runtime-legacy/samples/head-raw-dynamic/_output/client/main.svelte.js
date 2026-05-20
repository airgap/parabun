import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let condition = $.prop($$props, 'condition', 12);
	let foo = $.prop($$props, 'foo', 12);
	let bar = $.prop($$props, 'bar', 12);

	var $$exports = {
		get condition() {
			return condition();
		},

		set condition($$value) {
			condition($$value);
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
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Foo($$anchor, {
				get foo() {
					return foo();
				}
			});
		};

		var consequent_1 = ($$anchor) => {
			Bar($$anchor, {
				get bar() {
					return bar();
				}
			});
		};

		$.if(node, ($$render) => {
			if (condition() === 1) $$render(consequent); else if (condition() === 2) $$render(consequent_1, 1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}