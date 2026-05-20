import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><!></div>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.mutable_source(true);
	let data = $.mutable_source('Foo');

	function show() {
		$.set(visible, true);
	}

	function hide() {
		$.set(visible, false);
		$.set(data, 'Bar');
	}

	function fade(node) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	var $$exports = { show, hide };
	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var div = root_1();
			var node_2 = $.child(div);

			$.slot(
				node_2,
				$$props,
				'default',
				{
					get data() {
						return $.get(data);
					}
				},
				null
			);

			$.reset(div);
			$.transition(3, div, () => fade);
			$.append($$anchor, div);
		};

		$.if(node_1, ($$render) => {
			if ($.get(visible)) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'show', show);
	$.bind_prop($$props, 'hide', hide);

	return $.pop($$exports);
}