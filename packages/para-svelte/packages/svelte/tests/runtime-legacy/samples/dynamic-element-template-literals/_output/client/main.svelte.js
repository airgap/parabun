import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let size = $.prop($$props, 'size', 12);

	var $$exports = {
		get size() {
			return size();
		},

		set size($$value) {
			size($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, () => `h${size()}`, false, ($$element, $$anchor) => {
		var text = $.text();

		$.template_effect(() => $.set_text(text, `This is h${size() ?? ''} tag`));
		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}