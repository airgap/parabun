import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div style="opacity: 1;">yes</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let div = $.prop($$props, 'div', 12);
	let visible = $.prop($$props, 'visible', 12);

	function fade(node, params) {
		return {
			duration: 400,
			tick: (t) => {
				node.style.opacity = t;
			}
		};
	}

	var $$exports = {
		get div() {
			return div();
		},

		set div($$value) {
			div($$value);
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

	{
		var consequent = ($$anchor) => {
			var div_1 = root_1();

			$.bind_this(div_1, ($$value) => div($$value), () => div());
			$.transition(2, div_1, () => fade);
			$.append($$anchor, div_1);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}