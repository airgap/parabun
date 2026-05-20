import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input type="checkbox"/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let indeterminate = $.prop($$props, 'indeterminate', 12);

	var $$exports = {
		get indeterminate() {
			return indeterminate();
		},

		set indeterminate($$value) {
			indeterminate($$value);
			$.flush();
		}
	};

	var input = root();

	$.template_effect(() => input.indeterminate = indeterminate());
	$.append($$anchor, input);

	return $.pop($$exports);
}