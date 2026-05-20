import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';

var root_1 = $.from_html(`<span> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 1);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	A($$anchor, {
		get x() {
			return x();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const reflected = $.derived_safe_equal(() => $$slotProps.reflected);
				var span = root_1();
				var text = $.child(span, true);

				$.reset(span);
				$.template_effect(() => $.set_text(text, $.get(reflected)));
				$.append($$anchor, span);
			}
		}
	});

	return $.pop($$exports);
}