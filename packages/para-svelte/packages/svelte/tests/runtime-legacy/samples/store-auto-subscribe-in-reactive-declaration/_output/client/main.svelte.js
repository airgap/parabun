import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $count = () => $.store_get(count(), '$count', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let count = $.prop($$props, 'count', 12);
	let double = $.mutable_source();

	$.legacy_pre_effect(() => ($count()), () => {
		$.set(double, $count() * 2);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
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
	$.template_effect(() => $.set_text(text, `double ${$.get(double) ?? ''}`));
	$.event('click', button, () => count().update((n) => n + 1));
	$.append($$anchor, button);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}