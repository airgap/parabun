import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="foo">a</div>`);
var root_2 = $.from_html(`<div>b</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);
	let foo_text;
	let bar_text;

	function foo(node, { duration = 100 }) {
		foo_text = node.textContent;

		return () => {
			if (bar_text !== `b`) {
				throw new Error(`foo ran prematurely`);
			}

			return {
				duration,
				tick: (t) => {
					node.foo = t;
				}
			};
		};
	}

	function bar(node, { duration = 100 }) {
		bar_text = node.textContent;

		return () => {
			if (foo_text !== `a`) {
				throw new Error(`bar ran prematurely`);
			}

			return {
				duration,
				tick: (t) => {
					node.foo = t;
				}
			};
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

	$.init();

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(1, div, () => foo);
			$.append($$anchor, div);
		};

		var alternate = ($$anchor) => {
			var div_1 = root_2();

			$.transition(2, div_1, () => bar);
			$.append($$anchor, div_1);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}