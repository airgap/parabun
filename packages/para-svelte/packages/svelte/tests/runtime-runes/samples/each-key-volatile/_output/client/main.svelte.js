import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<p> </p>`), Main[$.FILENAME], [[9, 1]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let things = $.tag_proxy($.proxy([{ group: 'a', id: 1 }, { group: 'b', id: 2 }]), 'things');
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.each(node, 17, () => things, (thing) => [thing.group, thing.id], ($$anchor, thing) => {
			var p = root_1();
			var text = $.child(p);

			$.reset(p);
			$.template_effect(() => $.set_text(text, `${$.get(thing).group ?? ''}-${$.get(thing).id ?? ''}`));
			$.append($$anchor, p);
		}),
		'each',
		Main,
		8,
		0
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}