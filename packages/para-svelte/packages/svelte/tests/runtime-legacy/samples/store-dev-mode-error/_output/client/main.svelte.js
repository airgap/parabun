import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[5, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	const $count = () => (
		$.validate_store(count(), 'count'),
		$.store_get(count(), '$count', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	let count = $.prop($$props, 'count', 12);

	var $$exports = {
		...$.legacy_api(),
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	$.init();

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `count ${$count() ?? ''}`));

	$.event('click', button, function click() {
		return count().update((n) => n + 1);
	});

	$.append($$anchor, button);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}