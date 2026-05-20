import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let ref = $.prop($$props, 'ref', 12);

	var $$exports = {
		get ref() {
			return ref();
		},

		set ref($$value) {
			ref($$value);
			$.flush();
		}
	};

	var input = root();

	$.bind_this(input, ($$value) => ref($$value), () => ref());
	$.append($$anchor, input);

	return $.pop($$exports);
}