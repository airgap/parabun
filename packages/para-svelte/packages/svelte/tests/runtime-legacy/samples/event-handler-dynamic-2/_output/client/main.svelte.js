import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<button>toggle</button> <p> </p> <button>handler_a</button> <button>handler_b</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $handler_b = () => $.store_get(handler_b, '$handler_b', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const handler_a = $.mutable_source();
	let number = $.mutable_source(0);
	const handler_1 = () => $.set(number, 1);
	const handler_2 = () => $.set(number, 2);
	let flag = $.mutable_source(true);
	const handler_b = writable();

	$.legacy_pre_effect(() => ($.get(flag)), () => {
		$.set(handler_a, $.get(flag) ? handler_1 : handler_2);
	});

	$.legacy_pre_effect(() => ($.get(flag)), () => {
		handler_b.set($.get(flag) ? handler_1 : handler_2);
	});

	$.legacy_pre_effect_reset();
	$.init();

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p, true);

	$.reset(p);

	var button_1 = $.sibling(p, 2);
	var button_2 = $.sibling(button_1, 2);

	$.template_effect(() => $.set_text(text, $.get(number)));
	$.event('click', button, () => $.set(flag, !$.get(flag)));

	$.event('click', button_1, function (...$$args) {
		$.get(handler_a)?.apply(this, $$args);
	});

	$.event('click', button_2, function (...$$args) {
		$handler_b()?.apply(this, $$args);
	});

	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}