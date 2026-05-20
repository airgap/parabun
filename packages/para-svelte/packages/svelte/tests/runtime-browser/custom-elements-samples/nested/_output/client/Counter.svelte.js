import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { getContext } from "svelte";

var root = $.from_html(`<!> <button class="svelte-bf94eq"> </button> <p> </p>`, 1);

const $$css = {
	hash: 'svelte-bf94eq',
	code: 'button.svelte-bf94eq {color:red;}'
};

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);
	$.append_styles($$anchor, $$css);

	let count = $.prop($$props, 'count', 12, 0);
	const context = getContext("context");

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
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, null);

	var button = $.sibling(node, 2);
	var text = $.child(button);

	$.reset(button);

	var p = $.sibling(button, 2);
	var text_1 = $.child(p);

	$.reset(p);

	$.template_effect(() => {
		$.set_text(text, `count: ${count() ?? ''}`);
		$.set_text(text_1, `Context ${context ?? ''}`);
	});

	$.event('click', button, () => count(count() + 1));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

customElements.define('my-counter', $.create_custom_element(_unknown_, { count: {} }, ['default'], [], { mode: 'open' }));