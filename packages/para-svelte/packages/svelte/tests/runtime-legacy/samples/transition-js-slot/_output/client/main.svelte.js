import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<p>slotted</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);

	function foo(node, params) {
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
		}
	};

	Nested($$anchor, {
		get visible() {
			return visible();
		},

		children: ($$anchor, $$slotProps) => {
			var p = root_1();

			$.transition(3, p, () => foo);
			$.append($$anchor, p);
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}