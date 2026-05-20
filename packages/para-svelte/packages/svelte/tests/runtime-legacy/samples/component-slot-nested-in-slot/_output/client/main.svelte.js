import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import One from './One.svelte';

var root_1 = $.from_html(`<p slot="one"> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12, 1);
	let b = $.prop($$props, 'b', 12, 2);

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

	One($$anchor, {
		get a() {
			return a();
		},

		get b() {
			return b();
		},

		$$slots: {
			one: ($$anchor, $$slotProps) => {
				var p = root_1();
				const one = $.derived_safe_equal(() => $$slotProps.one);
				const two = $.derived_safe_equal(() => $$slotProps.two);
				var text = $.child(p);

				$.reset(p);
				$.template_effect(() => $.set_text(text, `one: ${$.get(one) ?? ''} two: ${$.get(two) ?? ''}`));
				$.append($$anchor, p);
			}
		}
	});

	return $.pop($$exports);
}