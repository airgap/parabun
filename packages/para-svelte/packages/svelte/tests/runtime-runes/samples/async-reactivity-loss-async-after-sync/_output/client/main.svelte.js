import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button> <button> </button> `, 1), Main[$.FILENAME], [[25, 0], [26, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');
	let other = $.tag($.state(0), 'other');

	function delayed(value, ms = 1000) {
		return new Promise((f) => setTimeout(() => f(value), ms));
	}

	async function foo() {
		(await $.track_reactivity_loss(new Promise((r) => setTimeout(r, 10))))();
	}

	async function bar() {
		const value = (await $.track_reactivity_loss(delayed($.get(count), 10)))();

		$.get(other // should trigger warning
		);

		return value;
	}

	async function get() {
		foo();

		return (await $.track_reactivity_loss(bar()))();
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	var text_2 = $.sibling(button_1);

	$.template_effect(
		($0) => {
			$.set_text(text, $.get(count));
			$.set_text(text_1, $.get(other));
			$.set_text(text_2, ` ${$0 ?? ''}`);
		},
		void 0,
		[async () => (await $.track_reactivity_loss(get()))()]
	);

	$.delegated('click', button, function click() {
		return $.update(count);
	});

	$.delegated('click', button_1, function click_1() {
		return $.update(other);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);