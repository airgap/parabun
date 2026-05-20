import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Async($$anchor) {
	var data;

	var $$promises = $.run([
		async () => data = await $.async_derived(() => Promise.resolve('test'))
	]);

	var div = root();
	var text = $.child(div, true);

	$.reset(div);

	$.template_effect(
		() => {
			$.set_attribute(div, 'data-resolved', $.get(data) ? 'true' : 'false');
			$.set_text(text, $.get(data));
		},
		void 0,
		void 0,
		[$$promises[0]]
	);

	$.append($$anchor, div);
}