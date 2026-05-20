import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let tags = $.prop($$props, 'tags', 28, () => [
		{ name: 'Red', color: '#FF0000' },
		{ name: 'Green', color: '#00FF00' },
		{ name: 'Blue', color: '#0000FF' }
	]);

	var $$exports = {
		get tags() {
			return tags();
		},

		set tags($$value) {
			tags($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, tags, $.index, ($$anchor, tag) => {
		const tagColor = $.derived_safe_equal(() => (
			$.deep_read_state(tags()),
			$.get(tag),
			$.untrack(() => tags().find((t) => t.name === $.get(tag).name).color)
		));

		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(tagColor)));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}