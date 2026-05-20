import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<div>else</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);

	function foo(node, params) {
		return {
			duration: 400,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	function bar(node, params) {
		return {
			duration: 400,
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
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.each(
		node_1,
		1,
		things,
		$.index,
		($$anchor, thing) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(thing)));
			$.append($$anchor, p);
		},
		($$anchor) => {
			var div = root_2();

			$.transition(1, div, () => foo);
			$.transition(2, div, () => bar);
			$.append($$anchor, div);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}