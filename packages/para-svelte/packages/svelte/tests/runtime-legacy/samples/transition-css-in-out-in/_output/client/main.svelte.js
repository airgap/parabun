import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);

	function foo() {
		return {
			duration: 100,
			css: (t) => {
				return `scale: ${t}`;
			}
		};
	}

	function bar() {
		return {
			duration: 100,
			css: (t) => {
				return `rotate: ${t * 360}deg; opacity: ${t}`;
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
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(1, div, () => foo);
			$.transition(2, div, () => bar);
			$.append($$anchor, div);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}