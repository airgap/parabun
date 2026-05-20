import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <button>toggle</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, 0);
	let toggle = $.prop($$props, 'toggle', 12, true);

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t, u) => {
				node.foo = t;
				node.oof = u;
			}
		};
	}

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get toggle() {
			return toggle();
		},

		set toggle($$value) {
			toggle($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_2 = $.first_child(fragment_1);

			$.key(node_2, value, ($$anchor) => {
				var div = root_2();
				var text = $.child(div, true);

				$.reset(div);
				$.template_effect(() => $.set_text(text, value()));
				$.transition(5, div, () => foo);
				$.append($$anchor, div);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node_1, ($$render) => {
			if (toggle()) $$render(consequent);
		});
	}

	var button = $.sibling(node_1, 2);

	$.event('click', button, () => toggle(!toggle()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}