import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button> `, 1), Main[$.FILENAME], [[13, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');

	async function run() {
		(await $.track_reactivity_loss(new Promise((r) => setTimeout(r))))();
	}

	async function get() {
		run();

		return 1;
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var text_1 = $.sibling(button);

	$.template_effect(
		($0) => {
			$.set_text(text, $.get(count));
			$.set_text(text_1, ` ${$0 ?? ''}`);
		},
		void 0,
		[async () => (await $.track_reactivity_loss(get()))()]
	);

	$.delegated('click', button, function click() {
		return $.update(count);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);