import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, 0);

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
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.key(node_1, value, ($$anchor) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, value()));
		$.transition(3, div, () => foo);
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}