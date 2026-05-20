import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<svelte-css-wrapper style="display: contents"><!></svelte-css-wrapper>`, 1);
var root = $.from_html(`<div><p class="svelte-q538ga">Slider2</p> <span class="svelte-q538ga">Track</span></div> <!>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let id = $.prop($$props, 'id', 12);
	let count = $.prop($$props, 'count', 12, 0);

	var $$exports = {
		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		},

		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var node = $.sibling(div, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var node_1 = $.first_child(fragment_1);

			{
				$.css_props(node_1, () => ({
					'--rail-color': 'rgb(0, 255, 255)',
					'--track-color': 'rgb(255, 255, 255)'
				}));

				_unknown_(node_1.lastChild, {
					get id() {
						return `nest-${id() ?? ''}`;
					},
					count: 1
				});

				$.reset(node_1);
			}

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (count() === 0) $$render(consequent);
		});
	}

	$.template_effect(() => $.set_attribute(div, 'id', id()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}