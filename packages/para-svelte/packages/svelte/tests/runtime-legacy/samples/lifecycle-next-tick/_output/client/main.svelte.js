import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { tick } from 'svelte';

var root = $.from_html(`<button> </button> <button> </button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let snapshots = $.prop($$props, 'snapshots', 28, () => []);
	let count = $.mutable_source(0);
	let buttons = $.mutable_source([]);

	function increment() {
		$.set(count, $.get(count) + 1);
		log();
	}

	function log() {
		snapshots().push(`before ${$.get(buttons)[0].textContent}`);

		tick().then(() => {
			snapshots().push(`after ${$.get(buttons)[0].textContent}`);
		});
	}

	var $$exports = {
		get snapshots() {
			return snapshots();
		},

		set snapshots($$value) {
			snapshots($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);
	$.bind_this(button, ($$value) => $.mutate(buttons, $.get(buttons)[0] = $$value), () => $.get(buttons)?.[0]);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);
	$.bind_this(button_1, ($$value) => $.mutate(buttons, $.get(buttons)[1] = $$value), () => $.get(buttons)?.[1]);

	$.template_effect(() => {
		$.set_text(text, $.get(count));
		$.set_text(text_1, $.get(count));
	});

	$.event('click', button, increment);
	$.event('click', button_1, log);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}