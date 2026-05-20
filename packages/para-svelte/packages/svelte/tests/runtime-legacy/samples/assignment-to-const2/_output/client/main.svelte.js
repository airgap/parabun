import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	const a = 100;
	const arr = $.mutable_source([{ a: 1 }, 2]);

	(($$value) => {
		var $$array = $.to_array($$value, 2);

		$.mutate(arr, $.get(arr)[0].a = $$array[0]);
		$.mutate(arr, $.get(arr)[1] = $.fallback($$array[1], a));
	})([$.get(arr)[1]]);

	var p = root();
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => ($.get(arr), $.untrack(() => JSON.stringify($.get(arr))))
	]);

	$.append($$anchor, p);
}