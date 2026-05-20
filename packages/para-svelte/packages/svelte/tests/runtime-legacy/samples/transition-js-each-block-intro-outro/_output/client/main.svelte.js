import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);
	let visible = $.prop($$props, 'visible', 12);

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	function bar(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.bar = t;
			}
		};
	}

	var $$exports = {
		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		},

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

	$.each(node_1, 1, things, $.index, ($$anchor, thing) => {
		var fragment_1 = $.comment();
		var node_2 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				var div = root_2();
				var text = $.child(div, true);

				$.reset(div);
				$.template_effect(() => $.set_text(text, $.get(thing)));
				$.transition(1, div, () => foo);
				$.transition(2, div, () => bar);
				$.append($$anchor, div);
			};

			$.if(node_2, ($$render) => {
				if (visible()) $$render(consequent);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}