import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Two from './Two.svelte';

export default function One($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		}
	};

	Two($$anchor, {
		get b() {
			return b();
		},

		$$slots: {
			two: ($$anchor, $$slotProps) => {
				const two = $.derived_safe_equal(() => $$slotProps.two);
				var fragment_1 = $.comment();
				var node = $.first_child(fragment_1);

				$.slot(
					node,
					$$props,
					'one',
					{
						get one() {
							return a();
						},

						get two() {
							return $.get(two);
						}
					},
					null
				);

				$.append($$anchor, fragment_1);
			}
		}
	});

	return $.pop($$exports);
}