import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
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

	$.each(node_1, 1, things, $.index, ($$anchor, thing) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, $.get(thing)));
		$.transition(5, div, () => foo);
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}