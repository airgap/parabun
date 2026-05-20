import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(` <button>x++</button> <button>y++</button>`, 1), Main[$.FILENAME], [[15, 0], [16, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let x = $.tag($.state(0), 'x');
	let y = $.tag($.state(0), 'y');

	async function foo(x) {
		if (x) {
			(await $.track_reactivity_loss(1 // restores reactivity loss warning context
			))();
			(await $.track_reactivity_loss(new Promise((r) => setTimeout(r, 10)) // saves reactivity loss warning context; should not keep it while running
			))();
		}

		return x;
	}

	var $$exports = { ...$.legacy_api() };

	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var button = $.sibling(text);
	var button_1 = $.sibling(button, 2);

	$.template_effect(($0) => $.set_text(text, `${$.get(x) ?? ''} ${$0 ?? ''} `), void 0, [async () => (await $.track_reactivity_loss(foo($.get(y))))()]);

	$.delegated('click', button, function click() {
		return $.set(x, $.get(x) + 1);
	});

	$.delegated('click', button_1, function click_1() {
		return $.set(y, $.get(y) + 1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);