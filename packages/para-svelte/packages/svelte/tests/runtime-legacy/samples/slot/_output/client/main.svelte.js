import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';

var root_1 = $.from_html(`<span>bye</span> <span>world</span>`, 1);
var root_2 = $.from_html(`<span slot="a">hello world</span>`);
var root_3 = $.from_html(`<span>bye world</span>`);
var root_4 = $.from_html(`<span slot="a">hello world</span>`);
var root_5 = $.from_html(`<span slot="b">hello world</span>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.mutable_source();
	let b = $.mutable_source();

	function getA() {
		return $.get(a).getData();
	}

	function getB() {
		return $.get(b).getData();
	}

	var $$exports = { getA, getB };
	var fragment = root();
	var node = $.first_child(fragment);

	$.bind_this(
		A(node, {
			children: ($$anchor, $$slotProps) => {
				var fragment_1 = root_1();

				$.next(2);
				$.append($$anchor, fragment_1);
			},

			$$slots: {
				default: true,
				a: ($$anchor, $$slotProps) => {
					var span = root_2();

					$.append($$anchor, span);
				}
			},
			$$legacy: true
		}),
		($$value) => $.set(a, $$value),
		() => $.get(a)
	);

	var node_1 = $.sibling(node, 2);

	$.bind_this(
		A(node_1, {
			children: ($$anchor, $$slotProps) => {
				var span_1 = root_3();

				$.append($$anchor, span_1);
			},

			$$slots: {
				default: true,
				a: ($$anchor, $$slotProps) => {
					var span_2 = root_4();

					$.append($$anchor, span_2);
				},

				b: ($$anchor, $$slotProps) => {
					var span_3 = root_5();

					$.append($$anchor, span_3);
				}
			},
			$$legacy: true
		}),
		($$value) => $.set(b, $$value),
		() => $.get(b)
	);

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'getA', getA);
	$.bind_prop($$props, 'getB', getB);

	return $.pop($$exports);
}