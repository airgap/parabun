import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

List[$.FILENAME] = 'List.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<li> </li>`), List[$.FILENAME], [[9, 2]]);
var root = $.add_locations($.from_html(`<ul></ul>`), List[$.FILENAME], [[7, 0]]);

export default function List($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, List);
	$.inspect(() => [$$props.things], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var ul = root();

	$.add_svelte_meta(
		() => $.each(ul, 21, () => $$props.things, $.index, ($$anchor, thing) => {
			var li = root_1();
			var text = $.child(li);

			$.reset(li);
			$.template_effect(() => $.set_text(text, `thing ${$.get(thing).id ?? ''}`));
			$.append($$anchor, li);
		}),
		'each',
		List,
		8,
		1
	);

	$.reset(ul);
	$.append($$anchor, ul);

	return $.pop($$exports);
}