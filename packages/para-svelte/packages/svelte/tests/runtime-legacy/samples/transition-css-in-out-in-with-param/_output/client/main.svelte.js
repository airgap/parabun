import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12, false);
	let param = $.prop($$props, 'param', 12, false);

	function getInParam() {
		return {
			duration: 100,
			css: (t) => {
				return `color: ${param() ? 'red' : 'blue'}`;
			}
		};
	}

	function getOutParam() {
		return {
			duration: 100,
			css: (t) => {
				return `color: ${param() ? 'green' : 'yellow'}`;
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

		get param() {
			return param();
		},

		set param($$value) {
			param($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(1, div, () => getInParam);
			$.transition(2, div, () => getOutParam);
			$.append($$anchor, div);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}