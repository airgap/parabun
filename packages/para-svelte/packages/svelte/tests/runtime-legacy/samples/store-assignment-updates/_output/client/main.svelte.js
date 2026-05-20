import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { derived } from 'svelte/store';

var root = $.from_html(`<button> </button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $count = () => $.store_get(count(), '$count', $$stores);
	const $doubled = () => $.store_get(doubled, '$doubled', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let count = $.prop($$props, 'count', 12);
	const doubled = derived(count(), ($count) => $count * 2);

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

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var p = $.sibling(button, 2);
	var text_1 = $.child(p);

	$.reset(p);

	$.template_effect(() => {
		$.set_text(text, `count ${$count() ?? ''}`);
		$.set_text(text_1, `doubled: ${$doubled() ?? ''}`);
	});

	$.event('click', button, () => $.store_set(count(), $count() + 1));
	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}