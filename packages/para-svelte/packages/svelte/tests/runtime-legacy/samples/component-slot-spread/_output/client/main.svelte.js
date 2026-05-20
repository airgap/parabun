import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let obj = $.prop($$props, 'obj', 28, () => ({ a: 1, b: 42 }));
	let c = $.prop($$props, 'c', 12, 5);
	let d = $.prop($$props, 'd', 12, 10);

	var $$exports = {
		get obj() {
			return obj();
		},

		set obj($$value) {
			obj($$value);
			$.flush();
		},

		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		},

		get d() {
			return d();
		},

		set d($$value) {
			d($$value);
			$.flush();
		}
	};

	Nested($$anchor, {
		get obj() {
			return obj();
		},

		get c() {
			return c();
		},

		get d() {
			return d();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const a = $.derived_safe_equal(() => $$slotProps.a);
				const b = $.derived_safe_equal(() => $$slotProps.b);
				const c = $.derived_safe_equal(() => $$slotProps.c);
				const d = $.derived_safe_equal(() => $$slotProps.d);
				var fragment_1 = root_1();
				var p = $.first_child(fragment_1);
				var text = $.child(p, true);

				$.reset(p);

				var p_1 = $.sibling(p, 2);
				var text_1 = $.child(p_1, true);

				$.reset(p_1);

				var p_2 = $.sibling(p_1, 2);
				var text_2 = $.child(p_2, true);

				$.reset(p_2);

				var p_3 = $.sibling(p_2, 2);
				var text_3 = $.child(p_3, true);

				$.reset(p_3);

				$.template_effect(() => {
					$.set_text(text, $.get(a));
					$.set_text(text_1, $.get(b));
					$.set_text(text_2, $.get(c));
					$.set_text(text_3, $.get(d));
				});

				$.append($$anchor, fragment_1);
			}
		}
	});

	return $.pop($$exports);
}