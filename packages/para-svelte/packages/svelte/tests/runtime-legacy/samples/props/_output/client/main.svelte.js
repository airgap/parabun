import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import RenderProps from './RenderProps.svelte';

var root_1 = $.from_html(`<p>some (unused) slotted content, to create an internal prop</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	RenderProps($$anchor, {
		get x() {
			return x();
		},

		children: ($$anchor, $$slotProps) => {
			var p = root_1();

			$.append($$anchor, p);
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}