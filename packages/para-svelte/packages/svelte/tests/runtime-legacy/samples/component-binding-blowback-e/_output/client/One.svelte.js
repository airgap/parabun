import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Two from './Two.svelte';

var root = $.from_html(`<!> <button>click me</button>`, 1);

export default function One($$anchor, $$props) {
	$.push($$props, false);

	let list = $.prop($$props, 'list', 12);
	let i = $.prop($$props, 'i', 12);

	function handle_click() {
		list([...list(), {}]);
	}

	var $$exports = {
		get list() {
			return list();
		},

		set list($$value) {
			list($$value);
			$.flush();
		},

		get i() {
			return i();
		},

		set i($$value) {
			i($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, list, $.index, ($$anchor, item, j) => {
		Two($$anchor, {
			get i() {
				return i();
			},
			j,
			get value() {
				return $.get(item).value;
			},

			set value($$value) {
				(
					$.get(item).value = $$value,
					$.invalidate_inner_signals(() => (list()))
				);
			},
			$$legacy: true
		});
	});

	var button = $.sibling(node, 2);

	$.event('click', button, handle_click);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}