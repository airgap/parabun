import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var option_content = $.from_html(`<b class="svelte-xyz">rich <i class="svelte-xyz">italic</i></b><e class="svelte-xyz">content</e>`, 1);
var select_content = $.from_html(`<button aria-label="Selected value" class="svelte-xyz"><selectedcontent class="svelte-xyz"></selectedcontent></button><option class="svelte-xyz">plain text</option><option class="svelte-xyz"><!></option>`, 1);
var root = $.from_html(`<select class="svelte-xyz"><!></select>`);

export default function Input($$anchor) {
	var select = root();

	$.customizable_select(select, () => {
		var anchor = $.child(select);
		var fragment = select_content();
		var button = $.first_child(fragment);
		var selectedcontent = $.child(button);

		$.selectedcontent(selectedcontent, ($$element) => selectedcontent = $$element);
		$.reset(button);

		var option = $.sibling(button, 2);

		$.customizable_select(option, () => {
			var anchor_1 = $.child(option);
			var fragment_1 = option_content();

			$.next();
			$.append(anchor_1, fragment_1);
		});

		$.append(anchor, fragment);
	});

	$.append($$anchor, select);
}