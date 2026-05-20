import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let tag = $.prop($$props, 'tag', 12, "h1");
	let visible = $.prop($$props, 'visible', 12);

	function foo() {
		return {
			duration: 100,
			css: (t) => {
				return `opacity: ${t}`;
			}
		};
	}

	var $$exports = {
		get tag() {
			return tag();
		},

		set tag($$value) {
			tag($$value);
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
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.element(node_1, tag, false, ($$element, $$anchor) => {
				$.transition(7, $$element, () => foo);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}