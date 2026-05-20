import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><!></div>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);
	let slotProps = $.prop($$props, 'slotProps', 12);

	function fade(node) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
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
		},

		get slotProps() {
			return slotProps();
		},

		set slotProps($$value) {
			slotProps($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();
			var node_2 = $.child(div);

			$.slot(node_2, $$props, 'default', $.spread_props({}, slotProps), null);
			$.reset(div);
			$.transition(3, div, () => fade);
			$.append($$anchor, div);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}