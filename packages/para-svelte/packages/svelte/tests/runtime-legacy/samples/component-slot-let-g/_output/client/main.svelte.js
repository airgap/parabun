import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';

var root_1 = $.from_html(`<span slot="foo"> </span>`);
var root = $.from_html(`<!> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 1);
	let y = $.mutable_source(0);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	A(node, {
		get x() {
			return x();
		},

		$$slots: {
			foo: ($$anchor, $$slotProps) => {
				var span = root_1();
				const reflected = $.derived_safe_equal(() => $$slotProps.reflected);
				var text = $.child(span, true);

				$.reset(span);

				$.template_effect(() => {
					$.set_class(span, 1, $.clsx($.get(reflected)));
					$.set_text(text, $.get(reflected));
				});

				$.event('click', span, () => $.set(y, $.get(reflected)));
				$.append($$anchor, span);
			}
		}
	});

	var text_1 = $.sibling(node);

	$.template_effect(() => $.set_text(text_1, ` ${$.get(y) ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}