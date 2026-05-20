import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, Foo);

	var $$exports = {
		Bar,
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.component(node_1, x, ($$anchor, $$component) => {
				$$component($$anchor, {});
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (x()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'Bar', Bar);

	return $.pop($$exports);
}