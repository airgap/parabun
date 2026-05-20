import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span>hello</span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);

	function foo(node) {
		console.log('in');

		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	function bar(node) {
		console.log('out');

		return {
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
			var span = root_1();

			$.transition(1, span, () => foo);
			$.transition(2, span, () => bar);
			$.append($$anchor, span);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}