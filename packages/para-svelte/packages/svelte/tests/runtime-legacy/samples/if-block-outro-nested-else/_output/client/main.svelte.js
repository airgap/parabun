import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, true);

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
		var consequent_2 = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					Component($$anchor, {});
				};

				var consequent_1 = ($$anchor) => {
					Component($$anchor, {});
				};

				$.if(node_1, ($$render) => {
					if (false) $$render(consequent); else if (false) $$render(consequent_1, 1);
				});
			}

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (foo()) $$render(consequent_2);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}