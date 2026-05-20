import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p class="then"> </p>`);
var root_2 = $.from_html(`<p class="catch"> </p>`);
var root_3 = $.from_html(`<p class="pending">loading...</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise = $.prop($$props, 'promise', 12);

	function foo(node) {
		return {
			duration: 100,
			tick: (t) => {
				node.setAttribute('foo', t.toFixed(1));
			}
		};
	}

	var $$exports = {
		get promise() {
			return promise();
		},

		set promise($$value) {
			promise($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.await(
		node_1,
		promise,
		($$anchor) => {
			var p_2 = root_3();

			$.transition(7, p_2, () => foo);
			$.append($$anchor, p_2);
		},
		($$anchor, value) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(value)));
			$.transition(3, p, () => foo);
			$.append($$anchor, p);
		},
		($$anchor, error) => {
			var p_1 = root_2();
			var text_1 = $.child(p_1, true);

			$.reset(p_1);

			$.template_effect(() => $.set_text(text_1, (
				$.deep_read_state($.get(error)),
				$.untrack(() => $.get(error).message)
			)));

			$.transition(3, p_1, () => foo);
			$.append($$anchor, p_1);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}