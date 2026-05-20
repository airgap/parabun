import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_svg(`<g><circle cx="50" cy="50" r="10" class="svelte-1qzlp1k"></circle><rect width="100" height="100" class="svelte-1qzlp1k"></rect></g>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let id = $.prop($$props, 'id', 12);

	var $$exports = {
		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		}
	};

	var g = root();

	$.template_effect(() => $.set_attribute(g, 'id', id()));
	$.append($$anchor, g);

	return $.pop($$exports);
}