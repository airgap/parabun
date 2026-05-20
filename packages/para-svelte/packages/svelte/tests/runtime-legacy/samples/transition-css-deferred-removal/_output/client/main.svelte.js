import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span class="outer"><span class="inner">double transition</span></span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);

	function foo(node) {
		return {
			duration: 200,
			css: (t) => {
				return `opacity: ${t}`;
			}
		};
	}

	function bar(node) {
		return {
			duration: 100,
			css: (t) => {
				return `left: ${t * 100}px`;
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
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var span = root_1();
			var span_1 = $.child(span);

			$.reset(span);
			$.transition(2, span_1, () => bar);
			$.transition(2, span, () => foo);
			$.append($$anchor, span);
		};

		$.if(node_1, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}