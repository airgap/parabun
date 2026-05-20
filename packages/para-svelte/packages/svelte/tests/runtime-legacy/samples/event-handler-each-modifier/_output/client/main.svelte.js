import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root_1 = $.from_html(`<div> <button>Normal</button> <button>Modifier</button></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $normal = () => $.store_get(normal, '$normal', $$stores);
	const $modifier = () => $.store_get(modifier, '$modifier', $$stores);
	const $lists = () => $.store_get(lists, '$lists', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const normal = writable(0);
	const modifier = writable(0);
	const lists = writable([]);

	const click = (e, type) => {
		if (type === 'normal') {
			$.update_store(normal, $normal());
		} else {
			$.update_store(modifier, $modifier());
		}
	};

	function getNormalCount() {
		return $normal();
	}

	function getModifierCount() {
		return $modifier();
	}

	var $$exports = { lists, getNormalCount, getModifierCount };

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, $lists, (item) => item.text, ($$anchor, item) => {
		var div = root_1();
		var text = $.child(div);
		var button = $.sibling(text);
		var button_1 = $.sibling(button, 2);

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${($.get(item), $.untrack(() => $.get(item).text)) ?? ''} `));
		$.event('click', button, (e) => click(e, 'normal'));
		$.event('click', button_1, $.preventDefault((e) => click(e, 'modifier')));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'lists', lists);
	$.bind_prop($$props, 'getNormalCount', getNormalCount);
	$.bind_prop($$props, 'getModifierCount', getModifierCount);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}