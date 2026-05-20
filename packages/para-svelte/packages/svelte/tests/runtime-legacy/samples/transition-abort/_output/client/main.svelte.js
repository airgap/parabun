import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div> </div>`);
var root_4 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let array = $.prop($$props, 'array', 28, () => ['a']);
	let visible = $.prop($$props, 'visible', 12, true);

	function slide(_) {
		return { duration: 100, css: (t) => `opacity: ${t}` };
	}

	var $$exports = {
		get array() {
			return array();
		},

		set array($$value) {
			array($$value);
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

	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.each(node_1, 1, array, $.index, ($$anchor, item) => {
				var div = root_2();
				var text = $.child(div, true);

				$.reset(div);
				$.template_effect(() => $.set_text(text, $.get(item)));
				$.transition(7, div, () => slide);
				$.append($$anchor, div);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	var node_2 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {};

		var alternate = ($$anchor) => {
			var fragment_2 = $.comment();
			var node_3 = $.first_child(fragment_2);

			$.each(node_3, 1, array, $.index, ($$anchor, item) => {
				var div_1 = root_4();
				var text_1 = $.child(div_1, true);

				$.reset(div_1);
				$.template_effect(() => $.set_text(text_1, $.get(item)));
				$.transition(7, div_1, () => slide);
				$.append($$anchor, div_1);
			});

			$.append($$anchor, fragment_2);
		};

		$.if(node_2, ($$render) => {
			if (!visible()) $$render(consequent_1); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}