import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, a, $.index, ($$anchor, x, $$index) => {
		Widget($$anchor, {
			get value() {
				return a()[$$index];
			},

			set value($$value) {
				(
					a()[$$index] = $$value,
					$.invalidate_inner_signals(() => (a()))
				);
			},
			$$legacy: true
		});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}