import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div>delayed</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);

	function foo(node, params) {
		return {
			delay: 50,
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	function bar(node, params) {
		return {
			delay: 50,
			duration: 100,
			tick: (t) => {
				node.bar = t;
			}
		};
	}

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(1, div, () => foo);
			$.transition(2, div, () => bar);
			$.append($$anchor, div);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}