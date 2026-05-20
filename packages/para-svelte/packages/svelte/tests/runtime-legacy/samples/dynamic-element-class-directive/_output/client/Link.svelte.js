import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Link($$anchor, $$props) {
	$.push($$props, false);

	let item = $.prop($$props, 'item', 12);

	var $$exports = {
		get item() {
			return item();
		},

		set item($$value) {
			item($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, () => "div", false, ($$element, $$anchor) => {
		$.set_class($$element, 0, 'svelte-70onls', null, {}, { active: true });

		var text = $.text();

		$.template_effect(() => $.set_text(text, ($.deep_read_state(item()), $.untrack(() => item().text))));
		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}