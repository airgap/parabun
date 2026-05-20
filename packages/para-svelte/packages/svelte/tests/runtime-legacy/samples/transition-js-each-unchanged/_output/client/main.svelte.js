import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let numbers = $.prop($$props, 'numbers', 12);

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	var $$exports = {
		get numbers() {
			return numbers();
		},

		set numbers($$value) {
			numbers($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.each(node_1, 1, numbers, $.index, ($$anchor, num) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, $.get(num)));
		$.transition(3, div, () => foo);
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}