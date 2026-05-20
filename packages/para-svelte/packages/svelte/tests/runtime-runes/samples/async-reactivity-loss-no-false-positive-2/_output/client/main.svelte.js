import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(` <button>count++</button>`, 1), Main[$.FILENAME], [[14, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');

	async function delay(c) {
		if (c) {
			(await $.track_reactivity_loss(new Promise((r) => setTimeout(r))))();
			$.get(count // count already read synchronously; should not result in reacitive loss warning
			);
		}

		return c;
	}

	var $$exports = { ...$.legacy_api() };

	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var button = $.sibling(text);

	$.template_effect(($0) => $.set_text(text, `${$0 ?? ''} `), void 0, [
		async () => (await $.track_reactivity_loss(delay($.get(count))))()
	]);

	$.delegated('click', button, function click() {
		return $.set(count, $.get(count) + 1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);