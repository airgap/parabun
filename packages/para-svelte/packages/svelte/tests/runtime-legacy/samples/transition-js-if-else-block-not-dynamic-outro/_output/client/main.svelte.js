import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div id="t">TRUE</div>`);
var root_2 = $.from_html(`<div id="f">FALSE</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let condition = $.prop($$props, 'condition', 12, true);

	function foo(node) {
		return {
			duration: 100,
			tick: (t) => {
				node.setAttribute('foo', t);
			}
		};
	}

	var $$exports = {
		get condition() {
			return condition();
		},

		set condition($$value) {
			condition($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(2, div, () => foo);
			$.append($$anchor, div);
		};

		var alternate = ($$anchor) => {
			var div_1 = root_2();

			$.transition(2, div_1, () => foo);
			$.append($$anchor, div_1);
		};

		$.if(node_1, ($$render) => {
			if (condition()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}